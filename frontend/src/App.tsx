import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ChatPage from './pages/ChatPage';
import AdminPage from './pages/AdminPage';

function App() {
  const [systemName, setSystemName] = useState('Erticaz Agent');
  const [systemLogo, setSystemLogo] = useState('');

  useEffect(() => {
    // Fetch settings from API
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.system_name) setSystemName(data.system_name);
        if (data.system_logo) setSystemLogo(data.system_logo);
      })
      .catch(err => console.error("Error fetching settings:", err));
  }, []);

  return (
    <Router>
      <div className="app-container dark-mode">
        <Routes>
          <Route path="/" element={<ChatPage systemName={systemName} systemLogo={systemLogo} />} />
          <Route path="/admin" element={<AdminPage systemName={systemName} systemLogo={systemLogo} setSystemName={setSystemName} setSystemLogo={setSystemLogo} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
