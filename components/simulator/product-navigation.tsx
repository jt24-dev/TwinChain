import { ArrowRight, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { productLinks } from '@/lib/product-entry';
import { PrivacyNote } from './product-info';

export function ProductHeader({
  onAbout,
  onHome,
  onDemo,
  onOpenApp,
  ready = true,
  pricing = false,
  workspace = false,
}: {
  onAbout: () => void;
  onHome?: () => void;
  onDemo?: () => void;
  onOpenApp?: () => void;
  ready?: boolean;
  pricing?: boolean;
  workspace?: boolean;
}) {
  const home = pricing || workspace ? productLinks.home : '';
  return (
    <header className="app-header home-header">
      <div className="brand">
        <div className="brand-mark">
          <Network size={23} />
        </div>
        <div>
          <h1>
            {onHome ? (
              <button
                className="brand-home-link"
                onClick={onHome}
                aria-label="TwinChain home"
              >
                TwinChain
              </button>
            ) : (
              <a href={productLinks.home} aria-label="TwinChain home">
                TwinChain
              </a>
            )}
          </h1>
          <p>Supply Chain Resilience Intelligence</p>
        </div>
      </div>
      <nav className="home-nav" aria-label="Main navigation">
        {workspace && <a href={productLinks.home}>Home</a>}
        <a href={`${home}#product`}>Product</a>
        <a href={`${home}#how-it-works`}>How It Works</a>
        <a
          href={productLinks.pricing}
          aria-current={pricing ? 'page' : undefined}
        >
          Pricing
        </a>
        <Button variant="ghost" onClick={onAbout}>
          About
        </Button>
      </nav>
      <div className="home-nav-actions">
        <Button
          className="home-button"
          variant="ghost"
          disabled={!ready}
          nativeButton={!!onDemo}
          onClick={onDemo}
          render={onDemo ? undefined : <a href={productLinks.demo} />}
        >
          Try Demo
        </Button>
        <Button
          className="home-button"
          disabled={!ready}
          nativeButton={!!onOpenApp}
          onClick={onOpenApp}
          render={onOpenApp ? undefined : <a href={productLinks.app} />}
        >
          {workspace ? 'Workspace' : 'Open App'}{' '}
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </header>
  );
}

export function ProductFooter({
  onAbout,
  pricing = false,
}: {
  onAbout: () => void;
  pricing?: boolean;
}) {
  const home = pricing ? productLinks.home : '';
  return (
    <footer className="home-footer">
      <div className="home-footer-top">
        <div>
          <strong>TwinChain</strong>
          <p>Built for supply chain resilience analysis.</p>
        </div>
        <nav aria-label="Footer navigation">
          <a href={`${home}#product`}>Product</a>
          <a href={`${home}#how-it-works`}>How It Works</a>
          <a
            href={productLinks.pricing}
            aria-current={pricing ? 'page' : undefined}
          >
            Pricing
          </a>
          <Button variant="ghost" onClick={onAbout}>
            About
          </Button>
          <Button variant="ghost" onClick={onAbout}>
            Methodology
          </Button>
        </nav>
      </div>
      <PrivacyNote />
      <p className="home-model-note">
        Illustrative modeling for exploration and learning. Results depend on
        your network data and the model’s assumptions.
      </p>
    </footer>
  );
}
