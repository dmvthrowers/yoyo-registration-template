import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import StaffPane from '@/components/StaffPane';
import { contest } from '@/contest.config';

export default function StaffPortalsPage() {
  return (
    <>
      <NavBar />
      <main id="main-content" className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <span className="inline-block bg-gold text-navy-deep text-xs font-black tracking-widest px-3 py-1 mb-3">{contest.shortName}</span>
          <h1 className="font-display font-black text-4xl text-gold mb-2">Staff Portal</h1>
          <p className="text-sm text-text-body">One sign-in for everything your roles allow. Looking for contestant or spectator access? Head back to <a href="/portal" className="text-gold-light underline">Portal Access</a>.</p>
        </div>
        <StaffPane />
      </main>
      <Footer />
    </>
  );
}
