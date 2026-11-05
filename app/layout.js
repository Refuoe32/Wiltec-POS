import './globals.css';
export const metadata = { title: 'WilTec POS System', description: 'WilTec Solutions point of sale', icons: { icon: '/icon.svg' } };
export default function Root({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
