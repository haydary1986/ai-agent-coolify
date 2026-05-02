import { useState, useEffect } from 'react';
import { Settings, BookOpen, Save, Link, DownloadCloud, CheckCircle2 } from 'lucide-react';

interface AdminPageProps {
  systemName: string;
  systemLogo: string;
  setSystemName: (name: string) => void;
  setSystemLogo: (logo: string) => void;
}

export default function AdminPage({ systemName, systemLogo, setSystemName, setSystemLogo }: AdminPageProps) {
  const [nameInput, setNameInput] = useState(systemName);
  const [logoInput, setLogoInput] = useState(systemLogo);
  const [skillUrl, setSkillUrl] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  useEffect(() => {
    // Check if model is loaded on mount
    const checkModel = async () => {
      try {
        const res = await fetch('/api/model-status?model_name=gemma2:9b');
        const data = await res.json();
        setIsModelLoaded(data.loaded);
      } catch (e) {
        console.error(e);
      }
    };
    checkModel();
    
    // Poll every 10 seconds if pulling
    let interval: any;
    if (isPulling) {
      interval = setInterval(checkModel, 10000);
    }
    return () => clearInterval(interval);
  }, [isPulling]);

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
      setStatusMsg('تم إرسال الرابط لمحرك التعلم في الخلفية!');
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const pullModel = async () => {
    setIsPulling(true);
    try {
      await fetch('/api/pull-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_name: 'gemma2:9b' })
      });
      setStatusMsg('بدأ تحميل نموذج gemma2:9b في الخلفية! (هذه العملية تستغرق 5-10 دقائق، يمكنك التحقق لاحقاً)');
      setTimeout(() => setStatusMsg(''), 5000);
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
              <button className="primary-btn" onClick={pullModel} disabled={isPulling} style={{backgroundColor: isPulling ? 'gray' : 'var(--accent)'}}>
                <DownloadCloud size={16} style={{display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem'}}/>
                {isPulling ? 'جاري التحميل والتثبيت (يرجى الانتظار)...' : 'تحميل نموذج Gemma 2 (9B)'}
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
          <div className="form-group">
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
        </div>

      </div>
    </div>
  );
}
