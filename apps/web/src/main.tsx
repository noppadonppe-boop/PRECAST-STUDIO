// Catch module/configuration failures before React has mounted its error boundary.
void import('./bootstrap').catch((reason: unknown) => {
  const root = document.getElementById('root');
  if (!root) return;
  const main = document.createElement('main');
  main.className = 'standalone-state'; main.setAttribute('role', 'alert');
  const heading = document.createElement('h1'); heading.textContent = 'เริ่มต้น Precast Studio ไม่สำเร็จ';
  const detail = document.createElement('p'); detail.textContent = reason instanceof Error ? reason.message : 'กรุณาตรวจการตั้งค่า Firebase และการเชื่อมต่อ';
  const retry = document.createElement('button'); retry.textContent = 'ลองใหม่'; retry.onclick = () => window.location.reload();
  main.append(heading, detail, retry); root.replaceChildren(main);
});
