// Passport-size photo, or initials when there is no photo yet
export default function Avatar({ photo, name, size = 40 }) {
  const ini = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const box = { width: size, height: Math.round(size * 1.29), borderRadius: 4, flex: 'none' };
  return photo
    ? <img src={photo} alt={name} style={{ ...box, objectFit: 'cover', border: '1px solid #c5cecb' }} />
    : <div style={{ ...box, background: '#cfe3df', color: '#095f54', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: size * 0.36 }}>{ini}</div>;
}
