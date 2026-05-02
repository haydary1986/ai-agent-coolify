import { useState, useEffect } from 'react';
import { Settings, BookOpen, Save, Link, DownloadCloud, CheckCircle2 } from 'lucide-react';

interface AdminPageProps {
  systemName: string;
  systemLogo: string;
  setSystemName: (name: string) => void;
  setSystemLogo: (logo: string) => void;
}

interface Skill {
  ID: number;
  Source: string;
  Type: string;
  Status: string;
  CreatedAt: string;
}

export default function AdminPage({ systemName, systemLogo, setSystemName, setSystemLogo }: AdminPageProps) {
  const [nameInput, setNameInput] = useState(systemName);
  const [logoInput, setLogoInput] = useState(systemLogo);
  const [skillUrl, setSkillUrl] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [skills, setSkills] = useState<Skill[]>([]);

  const fetchSkills = async () => {
    try {
      const res = await fetch('/api/skills');
      if (res.ok) {
        const data = await res.json();
        setSkills(data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSkills();

    // Check if model is loaded on mount
    const checkModel = async () => {
      try {
        const res = await fetch('/api/model-status?model_name=gemma2:9b');
        const data = await res.json();
        setIsModelLoaded(data.loaded);
        
        if (!data.loaded) {
          const progRes = await fetch('/api/pull-progress?model_name=gemma2:9b');
          const progData = await progRes.json();
          if (progData.progress > 0) {
            setIsPulling(true);
            setPullProgress(progData.progress);
            if (progData.progress >= 100) {
              setIsModelLoaded(true);
              setIsPulling(false);
            }
          }
        } else {
          setIsPulling(false);
        }
      } catch (e) {
        console.error(e);
      }
    };
    checkModel();
    
    // Poll every 5 seconds for status and skills
    const interval = setInterval(() => {
      checkModel();
      fetchSkills();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const saveSettings = async () => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_name: nameInput, system_logo: logoInput })
      });
      setSystemName(nameInput);
      setSystemLogo(logoInput);
      setStatusMsg('تم حفظ الإعدادات بنجاح!');
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const addSkill = async () => {
    if (!skillUrl) return;
    try {
      await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: skillUrl })
      });
      setSkillUrl('');
      setStatusMsg('تم إضافة الرابط وجاري المعالجة!');
      fetchSkills();
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteSkill = async (id: number) => {
    try {
      await fetch(`/api/skills/${id}`, { method: 'DELETE' });
      fetchSkills();
    } catch (e) {
      console.error(e);
    }
  };

  const pullModel = async () => {
    setIsPulling(true);
    setPullProgress(0.1);
    try {
      await fetch('/api/pull-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_name: 'gemma2:9b' })
      });
    } catch (e) {
      console.error(e);
      setStatusMsg('حدث خطأ أثناء محاولة التحميل');
      setIsPulling(false);
    }
  };

  return (
    <div style={{display: 'flex', width: '100%', height: '100%'}}>
      <div className="sidebar glass-panel">
        <div className="sidebar-header" style={{fontSize: '1.25rem'}}>
          <Settings size={24} />
          لوحة الإدارة
        </div>
        <div style={{color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '1rem'}}>
          <a href="/" style={{color: 'inherit', textDecoration: 'none'}}>← العودة للمحادثة</a>
        </div>
      </div>

      <div className="admin-container">
        <h1 className="admin-header">إعدادات {systemName}</h1>
        
        {statusMsg && (
          <div style={{background: 'rgba(74, 222, 128, 0.2)', color: '#4ade80', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem'}}>
            {statusMsg}
          </div>
        )}

        <div className="admin-card glass-panel">
          <h2 style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <DownloadCloud size={20} color="var(--accent)" /> إدارة النماذج الذكية
          </h2>
          {isModelLoaded ? (
             <div style={{color: '#4ade80', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', background: 'rgba(74, 222, 128, 0.1)', padding: '0.75rem', borderRadius: '0.5rem'}}>
                <CheckCircle2 size={18} />
                الذكاء (gemma2:9b) محمل ويعمل بنجاح! يمكنك التحدث معه الآن في واجهة المحادثة.
             </div>
          ) : (
            <>
              <p style={{color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem'}}>
                الذكاء الحالي غير محمل. يرجى الضغط على الزر أدناه لبدء تحميل العقل الأساسي (gemma2:9b) ليعمل محلياً بالكامل.
              </p>
              
              {isPulling && pullProgress > 0 && (
                <div style={{marginBottom: '1rem'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem'}}>
                    <span>جاري التحميل...</span>
                    <span>{pullProgress.toFixed(1)}%</span>
                  </div>
                  <div style={{width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden'}}>
                    <div style={{width: `${pullProgress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.5s'}} />
                  </div>
                </div>
              )}

              <button className="primary-btn" onClick={pullModel} disabled={isPulling} style={{backgroundColor: isPulling ? 'gray' : 'var(--accent)'}}>
                <DownloadCloud size={16} style={{display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem'}}/>
                {isPulling ? 'جاري التحميل في الخلفية...' : 'تحميل نموذج Gemma 2 (9B)'}
              </button>
            </>
          )}
        </div>

        <div className="admin-card glass-panel">
          <h2 style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <Settings size={20} color="var(--accent)" /> تخصيص الهوية
          </h2>
          <div className="form-group">
            <label>اسم النظام (يظهر في الواجهة)</label>
            <input 
              className="form-input" 
              value={nameInput} 
              onChange={e => setNameInput(e.target.value)}
              placeholder="مثال: ارتكاز"
            />
          </div>
          <div className="form-group">
            <label>رابط الشعار (Logo URL)</label>
            <input 
              className="form-input" 
              value={logoInput} 
              onChange={e => setLogoInput(e.target.value)}
              placeholder="https://example.com/logo.png"
              dir="ltr"
            />
          </div>
          <button className="primary-btn" onClick={saveSettings}>
            <Save size={16} style={{display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem'}}/>
            حفظ التغييرات
          </button>
        </div>

        <div className="admin-card glass-panel">
          <h2 style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <BookOpen size={20} color="var(--accent)" /> قاعدة المعرفة (تعليم الوكيل)
          </h2>
          <p style={{color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem'}}>
            أدخل روابط المواقع أو المقالات التي تريد من الوكيل الذكي تعلمها وتحليلها ليجيب بناءً عليها.
          </p>
          <div className="form-group" style={{marginBottom: '2rem'}}>
            <label>رابط صفحة أو مقال (URL)</label>
            <div style={{display: 'flex', gap: '1rem'}}>
              <input 
                className="form-input" 
                value={skillUrl} 
                onChange={e => setSkillUrl(e.target.value)}
                placeholder="https://..."
                dir="ltr"
              />
              <button className="primary-btn" onClick={addSkill} style={{whiteSpace: 'nowrap'}}>
                <Link size={16} style={{display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem'}}/>
                إضافة للتعلم
              </button>
            </div>
          </div>

          <h3 style={{fontSize: '1rem', marginBottom: '1rem', color: 'var(--text)'}}>الروابط المضافة مسبقاً</h3>
          <div style={{overflowX: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.9rem'}}>
              <thead>
                <tr style={{borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)'}}>
                  <th style={{padding: '0.75rem'}}>الرابط / المصدر</th>
                  <th style={{padding: '0.75rem'}}>الحالة</th>
                  <th style={{padding: '0.75rem'}}>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {skills.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
                      لا توجد روابط مضافة حالياً.
                    </td>
                  </tr>
                ) : (
                  skills.map(skill => (
                    <tr key={skill.ID} style={{borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                      <td style={{padding: '0.75rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} dir="ltr">
                        <a href={skill.Source} target="_blank" rel="noreferrer" style={{color: 'var(--accent)', textDecoration: 'none'}}>{skill.Source}</a>
                      </td>
                      <td style={{padding: '0.75rem'}}>
                        <span style={{
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '1rem', 
                          fontSize: '0.8rem',
                          backgroundColor: skill.Status === 'completed' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(250, 204, 21, 0.1)',
                          color: skill.Status === 'completed' ? '#4ade80' : '#facc15'
                        }}>
                          {skill.Status === 'completed' ? 'مكتمل ✅' : 'جاري المعالجة ⏳'}
                        </span>
                      </td>
                      <td style={{padding: '0.75rem'}}>
                        <button 
                          onClick={() => deleteSkill(skill.ID)}
                          style={{background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem'}}
                        >
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
