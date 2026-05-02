import os
import requests
import subprocess
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import tool
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_community.chat_message_histories import SQLChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory

# Load environment variables from .env file
load_dotenv()

# --- Server & Infrastructure Tools ---

@tool
def list_coolify_servers() -> str:
    """Lists all servers managed by the Coolify instance. Returns JSON string of servers."""
    url = f"{os.getenv('COOLIFY_URL', 'https://docker.erticaz.com')}/api/v1/servers"
    token = os.getenv('COOLIFY_TOKEN')
    if not token:
        return "Error: COOLIFY_TOKEN not found."
    
    headers = {"Authorization": f"Bearer {token}"}
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        servers = response.json()
        return str([{"name": s.get("name"), "ip": s.get("ip"), "uuid": s.get("uuid")} for s in servers])
    except Exception as e:
        return f"Failed to list Coolify servers: {str(e)}"

@tool
def create_cloudflare_subdomain(subdomain: str, ip_address: str) -> str:
    """Creates a new DNS A record (subdomain) on Cloudflare pointing to the given IP address."""
    email = os.getenv('CLOUDFLARE_EMAIL')
    token = os.getenv('CLOUDFLARE_TOKEN')
    zone_id = os.getenv('CLOUDFLARE_ZONE_ID')
    
    if not all([email, token, zone_id]):
        return "Error: Cloudflare credentials not fully set."
        
    url = f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records"
    headers = {
        "X-Auth-Email": email,
        "X-Auth-Key": token,
        "Content-Type": "application/json"
    }
    
    full_domain = subdomain if subdomain.endswith("erticaz.com") else f"{subdomain}.erticaz.com"
    data = {
        "type": "A",
        "name": full_domain,
        "content": ip_address,
        "ttl": 1,
        "proxied": True
    }
    
    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        return f"Successfully created subdomain: {full_domain} pointing to {ip_address}"
    except Exception as e:
        return f"Failed to create subdomain: {str(e)}"

@tool
def search_github_repos(query: str) -> str:
    """Searches public GitHub repositories based on the query."""
    url = f"https://api.github.com/search/repositories?q={query}"
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        items = data.get("items", [])[:5]
        return str([{"name": repo["full_name"], "url": repo["html_url"], "description": repo["description"]} for repo in items])
    except Exception as e:
        return f"Failed to search GitHub: {str(e)}"

@tool
def search_internet_tool(query: str) -> str:
    """Searches the internet for the given query. Use this to find documentation, errors, or any information you don't know. To learn from GitHub, add 'site:github.com' to your query."""
    try:
        search = DuckDuckGoSearchRun()
        return search.invoke(query)
    except Exception as e:
        return f"Error searching the internet: {str(e)}"

# --- Autonomous Coding Tools ---

@tool
def read_file_tool(file_path: str) -> str:
    """Reads the contents of a file at the specified path."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"Error reading file: {str(e)}"

@tool
def write_file_tool(file_path: str, content: str) -> str:
    """Writes the given content to a file at the specified path. Creates the file if it does not exist, overwrites it if it does."""
    try:
        # Create directories if they don't exist
        os.makedirs(os.path.dirname(os.path.abspath(file_path)), exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return f"Successfully wrote to {file_path}"
    except Exception as e:
        return f"Error writing file: {str(e)}"

@tool
def run_terminal_command_tool(command: str) -> str:
    """Executes a shell command in the terminal and returns its standard output and standard error. Use this to run tests, create directories, npm install, etc."""
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=60)
        output = f"Exit Code: {result.returncode}\n"
        if result.stdout:
            output += f"STDOUT:\n{result.stdout}\n"
        if result.stderr:
            output += f"STDERR:\n{result.stderr}\n"
        return output
    except subprocess.TimeoutExpired:
        return "Error: Command timed out after 60 seconds."
    except Exception as e:
        return f"Error executing command: {str(e)}"

# List of all tools provided to the agent
tools = [
    list_coolify_servers, 
    create_cloudflare_subdomain, 
    search_github_repos,
    search_internet_tool,
    read_file_tool,
    write_file_tool,
    run_terminal_command_tool
]

def get_model():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY environment variable is not set. Please set it in .env file.")
    # gemini-1.5-flash is excellent for speed, switch to gemini-1.5-pro for complex coding logic.
    return ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0)

# The new Beast Mode System Prompt
SYSTEM_PROMPT = """You are an elite, autonomous Senior Software Engineer and DevOps Expert (AI Agent).
You are capable of planning, writing, testing, and deploying complex software systems.

You have access to the following capabilities via tools:
1. File System Management: Read from and write to any file.
2. Terminal Execution: Run arbitrary shell commands, start servers, install dependencies, and run tests.
3. Infrastructure Management: Manage Coolify servers and Cloudflare DNS records.
4. Internet & Knowledge Access: Search the internet and GitHub for documentation, examples, and answers.

WORKFLOW:
1. When given a task, think step-by-step.
2. If you are asked about something you do not know, immediately use `search_internet_tool` to search the web or GitHub to teach yourself.
3. If you need to understand the codebase, use read_file_tool or run_terminal_command_tool (like 'ls -la' or 'cat').
4. If you need to write or modify code, use write_file_tool. Ensure you provide the full, correct code.
5. If you need to test code or run scripts, use run_terminal_command_tool.
6. If the user asks you to deploy or manage servers, use the Coolify and Cloudflare tools.
7. If an error occurs, search the internet for the error log, analyze it, and fix the issue autonomously.

Never say you cannot do something if a tool exists for it. You are a beast at programming. Do the work!
"""

def get_session_history(session_id: str):
    return SQLChatMessageHistory(session_id, "sqlite:///memory.db")

def get_agent_response(user_message: str, session_id: str = "default_session") -> str:
    try:
        llm = get_model()
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_PROMPT),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])
        
        agent = create_tool_calling_agent(llm, tools, prompt)
        # Increased max_iterations to allow the agent to think, test, and fix errors automatically
        agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True, max_iterations=10)
        
        agent_with_chat_history = RunnableWithMessageHistory(
            agent_executor,
            get_session_history,
            input_messages_key="input",
            history_messages_key="chat_history",
        )
        
        response = agent_with_chat_history.invoke(
            {"input": user_message},
            config={"configurable": {"session_id": session_id}}
        )
        return response["output"]
    except Exception as e:
        return f"Error connecting to the AI Model: {str(e)}"
