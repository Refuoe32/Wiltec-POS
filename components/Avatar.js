// Passport-size photo (35:45), or initials when there is no photo yet. round = small circular version for headers.
export default function Avatar({ photo, name, size = 40, round = false }) {
  const ini = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const box = round ? { width: size, height: size, borderRadius: '50%' } : { width: size, height: Math.round(size * 45 / 35), borderRadius: 6 };
  return photo
    ? <img src={photo} alt={name} style={{ ...box, flex: 'none', objectFit: 'cover', objectPosition: 'top', border: '1px solid #d9dfe2', background: '#fff' }} />
    : <div style={{ ...box, flex: 'none', background: '#cfeadc', color: '#07784a', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: size * 0.36 }}>{ini}</div>;
}
