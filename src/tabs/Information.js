import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import lofuImage from '../assets/3.png';
import '../components/Screen.css';
import '../components/Information.css';
import ThemeToggle from '../components/darkmode';

// Arch images
import flatImg from '../assets/Arch/Flat Foot/Flat1.png';
import flatImg2 from '../assets/Arch/Flat Foot/Flat2.png';
import highImg from '../assets/Arch/High Arch/High1.png';
import highImg2 from '../assets/Arch/High Arch/High2.png';
import normalImg from '../assets/Arch/Normal Arch/Normal1.png';
import normalImg2 from '../assets/Arch/Normal Arch/Normal2.png';

function InformationPage() {
  // Theme
  const systemPrefersDark = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches,
    []
  );
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ?? (systemPrefersDark ? 'dark' : 'light');
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const [openModal, setOpenModal] = useState(null); // "Flat" | "Normal" | "High" | null

  // Content
  const archInfo = {
    Flat: {
      title: 'Flat Arch (Pes Planus)',
      short:
        'Flat feet (Pes planus) is characterized by the absence or collapse of the medial longitudinal arch.',
      long: (
        <>
          <p>
            A <strong>Flat feet</strong>, or medically known as <em>pes planus</em>, is defined as a foot condition
            characterized by the absence of a physiological arch{' '}
            <a
              href="https://www.sciencedirect.com/science/article/pii/S2773157X23001224"
              target="_blank"
              rel="noopener noreferrer"
            >
              [1]
            </a>{' '}
            or when the longitudinal arches have been lost{' '}
            <a
              href="https://teachmeanatomy.info/lower-limb/misc/foot-arches/#section-688b297aeaf43"
              target="_blank"
              rel="noopener noreferrer"
            >
              [2]
            </a>
            . Flat feet can be congenital or acquired when arches fail to develop during childhood{' '}
            <a
              href="https://www.mayoclinic.org/diseases-conditions/flatfeet/symptoms-causes/syc-20372604"
              target="_blank"
              rel="noopener noreferrer"
            >
              [3]
            </a>
            ; flat arches in infancy are common{' '}
            <a
              href="https://teachmeanatomy.info/lower-limb/misc/foot-arches/#section-688b297aeaf43"
              target="_blank"
              rel="noopener noreferrer"
            >
              [2]
            </a>
            . Acquired flat foot can follow posterior tibial tendon dysfunction, Charcot changes, arthritis, or trauma{' '}
            <a
              href="https://my.clevelandclinic.org/health/diseases/flat-feet-pes-planus"
              target="_blank"
              rel="noopener noreferrer"
            >
              [4]
            </a>
            . Supportive footwear/insoles may help; persistent pain warrants clinical assessment.
          </p>
          <p>
            Flat feet may be congenital (present at birth) or acquired due to posterior tibial tendon dysfunction,
            arthritis, injury, or progressive changes with age. They can be asymptomatic but may lead to overpronation,
            fatigue, and discomfort without adequate support and footwear.
          </p>
        </>
      ),
      images: [flatImg, flatImg2],
    },
    Normal: {
      title: 'Normal Arch',
      short:
        'A normal arch provides a balanced foundation with even load sharing across the foot.',
      long: (
        <>
          <p>
            A <strong>normal arch</strong> provides efficient shock absorption and a neutral alignment of the foot,
            ankle, and lower limb. Weight is shared across the heel, lateral foot, and forefoot in a way that minimizes
            excessive strain on any one structure, which often correlates with comfortable walking/running and fewer
            overuse issues when activity is gradual and footwear fits well.
          </p>
          <p>
            Even with a normal arch, problems can arise from <em>training errors</em> (sudden spikes in volume),{' '}
            <em>worn-out or ill-fitting shoes</em>, or <em>biomechanical asymmetries</em> elsewhere (e.g., hip weakness).
            Helpful habits include rotating footwear, replacing shoes after significant mileage, and maintaining
            calf/foot strength and mobility. Seek evaluation if you notice persistent pain, swelling, or changes in gait.
          </p>
        </>
      ),
      images: [normalImg, normalImg2],
    },
    High: {
      title: 'High Arch (Pes Cavus)',
      short:
        'High arches (Pes cavus) reduce the contact area with the ground, concentrating pressure at the heel and forefoot.',
      long: (
        <>
          <p>
            A <strong>High arch</strong>, or <em>pes cavus</em>, describes an arch higher than typical{' '}
            <a
              href="https://medlineplus.gov/ency/article/001261.htm"
              target="_blank"
              rel="noopener noreferrer"
            >
              [3]
            </a>
            . It can be idiopathic or related to neurologic/systemic conditions{' '}
            <a
              href="https://my.clevelandclinic.org/health/diseases/high-arch-feet-pes-cavus"
              target="_blank"
              rel="noopener noreferrer"
            >
              [1]
            </a>
            , such as Charcot–Marie–Tooth disease or cerebral palsy{' '}
            <a
              href="https://www.foothealthfacts.org/conditions/cavus-foot-(high-arched-foot)"
              target="_blank"
              rel="noopener noreferrer"
            >
              [2]
            </a>
            . Less midfoot contact means forces concentrate in the heel and ball of the foot, increasing the risk of
            calluses and soreness. Cushioned shoes, metatarsal pads, and gradual training progressions often help.
          </p>
          <p>
            Cushioned footwear, metatarsal pads, and arch-appropriate insoles can improve comfort by spreading pressure.
            Gentle calf and plantar fascia stretching may reduce tightness and improve tolerance during walking or
            running.
          </p>
        </>
      ),
      images: [highImg, highImg2],
    },
  };

  // Symptom lists (aligned cards)
  const symptoms = {
    Flat: {
      title: 'Flat Arch – Symptoms',
      lists: [
        {
          sub: 'Common',
          items: [
            'Foot pain after walking or prolonged standing',
            'Ankle pain from overpronation',
            'Shin splints due to compensations',
          ],
        },
        {
          sub: 'If untreated, may develop',
          items: [
            'Gait abnormalities',
            'Toe/forefoot deformities (e.g., bunions, hammertoes)',
            'Chronic or recurrent pain',
          ],
        },
      ],
    },
    High: {
      title: 'High Arch – Symptoms',
      lists: [
        {
          sub: 'Common',
          items: [
            'Heel/forefoot pain or hotspots',
            'Ankle pain or swelling',
            'Arch tightness/discomfort',
          ],
        },
        {
          sub: 'If untreated, may develop',
          items: [
            'Corns or calluses in high-pressure areas',
            'Ankle instability or recurrent sprains',
            'Claw or hammer toes',
          ],
        },
      ],
    },
  };

  return (
    <div className="App info-page">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-logo">
          <Link to="/">
            <img src={lofuImage} alt="Lofu" className="lofu-name" />
          </Link>
        </div>

        <div className="navbar-right">
          <ul className="navbar-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/result">Result</Link></li>
            <li><Link to="/history">History</Link></li>
            <li><Link to="/information" className="active">Information</Link></li>
          </ul>
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </div>
      </nav>

      {/* Page scroller */}
      <div className="info-scroll">
        <div className="info-body">
          {/* Hero */}
          <div className="info-hero">
            <h1>Foot Arch Types</h1>
            <p className="info-sub">Quick overviews with more details in each modal.</p>
          </div>

          {/* Cards */}
          <div className="info-grid">
            {['Flat', 'Normal', 'High'].map((type) => (
              <div key={type} className="info-card">
                <h3>{archInfo[type].title}</h3>
                <p>{archInfo[type].short}</p>
                <button className="info-more-btn" onClick={() => setOpenModal(type)}>
                  More…
                </button>
              </div>
            ))}
          </div>

          {/* Modal */}
          {openModal && (
            <div className="info-modal__overlay" onClick={() => setOpenModal(null)}>
              <div className="info-modal__content" onClick={(e) => e.stopPropagation()}>
                <button className="info-modal__close" onClick={() => setOpenModal(null)}>
                  &times;
                </button>

                <h3 className="info-modal__title">{archInfo[openModal].title}</h3>

                {/* Text first */}
                <div className="info-modal__body">{archInfo[openModal].long}</div>

                {/* Images directly below text */}
                {(archInfo[openModal].images || []).length > 0 && (
                  <div className="info-modal__images">
                    {archInfo[openModal].images.map((src, idx) => (
                      <img
                        key={idx}
                        src={src}
                        alt={`${openModal} Arch ${idx + 1}`}
                        loading="lazy"
                        className="info-modal__image"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Symptoms (aligned cards). Normal arch omitted. */}
          <section className="symptoms-section">
            <h2 className="symptoms-title">Symptoms</h2>
            <div className="symptoms-grid-2">
              {['Flat', 'High'].map((t) => (
                <div key={t} className="symptom-card">
                  <h3>{symptoms[t].title}</h3>
                  {symptoms[t].lists.map((group, i) => (
                    <div key={i}>
                      <div className="symptom-sub">{group.sub}</div>
                      <ul className="symptom-ul">
                        {group.items.map((it, k) => <li key={k}>{it}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default InformationPage;
