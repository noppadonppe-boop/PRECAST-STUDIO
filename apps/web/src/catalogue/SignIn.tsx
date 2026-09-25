import { useEffect, useState, type FormEvent } from 'react';

export function SignIn({ onSuccess }: { onSuccess: () => void }) {
  const [access, setAccess] = useState<{ mode: string; login: { apiKey: string } | null } | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { void fetch('/api/catalogue/access').then(r => r.ok ? r.json() : null).then(setAccess).catch(() => setMessage('ติดต่อคลังไม่ได้ กรุณาลองใหม่')); }, []);
  async function signIn(event: FormEvent) {
    event.preventDefault();
    if (!access?.login) return;
    setBusy(true); setMessage('');
    try {
      const auth = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(access.login.apiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
      if (!auth.ok) throw new Error('ตรวจสอบอีเมลและรหัสผ่าน หรือสิทธิ์เข้าใช้งานกับผู้ดูแล');
      const { idToken } = await auth.json() as { idToken: string };
      const session = await fetch('/api/catalogue/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) });
      if (!session.ok) throw new Error('ต้องยืนยันอีเมลและเป็นสมาชิกโครงการที่มีสิทธิ์อ่านคลัง กรุณาติดต่อผู้ดูแล');
      setPassword(''); onSuccess();
    } catch (reason) { setPassword(''); setMessage(reason instanceof Error ? reason.message : 'เข้าสู่ระบบไม่ได้'); }
    finally { setBusy(false); }
  }
  return access?.mode === 'TEAM' ? <form className="cat-login" onSubmit={e => void signIn(e)}><label>อีเมลทีม<input autoComplete="username" type="email" required value={email} onChange={e => setEmail(e.target.value)}/></label><label>รหัสผ่าน<input autoComplete="current-password" type="password" required value={password} onChange={e => setPassword(e.target.value)}/></label><button className="cat-primary" disabled={busy}>{busy ? 'กำลังตรวจสิทธิ์…' : 'เข้าสู่คลังแบบ'}</button>{message && <p role="alert">{message}</p>}<p>บัญชีต้องได้รับสิทธิ์จากผู้ดูแล ไม่มีการสมัครหรืออนุมัติสมาชิกอัตโนมัติ</p></form>
    : <div><p className="cat-note">ฉบับทดลองสำหรับเจ้าของเครื่อง ยังไม่ใช่บริการสมาชิกทีม ลิงก์เข้าใช้ได้ครั้งเดียวและมีอายุ 10 นาที เซสชันมีอายุ 4 ชั่วโมง</p>{message && <p role="alert">{message}</p>}</div>;
}
