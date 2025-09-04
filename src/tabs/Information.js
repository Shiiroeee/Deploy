import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import lofuImage from '../assets/LOGO21.png';
import '../App.css';
import '../components/Screen.css';
import '../components/Information.css'; 

function InformationPage() {
  const [openModal, setOpenModal] = useState(null); 

  const archInfo = {
    Flat: {
      title: 'Flat Arch (Pes Planus)',
      short: 'Flat feet, or medically known as Pes planus, is defined as a foot condition characterized by the absence of a physiological arch.',
    },
    Normal: {
      title: 'Normal Arch',
      short: 'A normal arch maintains a balanced curve, offering good shock absorption.',
      description: 'A normal arch maintains a balanced curve, offering good shock absorption. People with normal arches typically experience fewer foot issues and require standard shoe support.'
    },
    High: {
      title: 'High Arch (Pes Cavus)',
      short: 'High Arch, or otherwise known as Pes Cavus, is defined as when your foot arch is more raised than normal',
    }
  };

  return (
    <div className="App">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="navbar-logo">
          <Link to="/"><img src={lofuImage} alt="Lofu" className="lofu-name" /></Link>
        </div>
        <ul className="navbar-links">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/result">Result</Link></li>
          <li><Link to="/information">Information</Link></li>
        </ul>
      </nav>

      <div className="info-body centered">
        <h2 className="info-title">Foot Arch Types</h2>

        <div className="modal-box-container">
          {Object.keys(archInfo).map((type) => (
            <div key={type} className="modal-box modern">
              <h3>{archInfo[type].title}</h3>
              <p>
                {archInfo[type].short}
                <span className="more-link" onClick={() => setOpenModal(type)}> more...</span>
              </p>
            </div>
          ))}
        </div>

        {/* Modal */}
        {openModal && (
          <div className="modal-overlay" onClick={() => setOpenModal(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close-icon" onClick={() => setOpenModal(null)}>&times;</button>
              <h3>{archInfo[openModal].title}</h3>

              {openModal === "Flat" ? (
                <p>
                  Flat feet, or medically known as Pes planus, is defined as a foot condition characterized by the absence of a physiological arch
                  <a href="https://www.sciencedirect.com/science/article/pii/S2773157X23001224" target="_blank" rel="noopener noreferrer">[1]</a> or when the longitudinal arches have been lost
                  <a href="https://teachmeanatomy.info/lower-limb/misc/foot-arches/#section-688b297aeaf43" target="_blank" rel="noopener noreferrer">[2]</a>. Flat feet can occur congenitally (present at birth) or be acquired over time, when the arches of the feet do not develop during childhood
                  <a href="https://www.mayoclinic.org/diseases-conditions/flatfeet/symptoms-causes/syc-20372604" target="_blank" rel="noopener noreferrer">[3]</a>, however flat feet during infancy is normal
                  <a href="https://teachmeanatomy.info/lower-limb/misc/foot-arches/#section-688b297aeaf43" target="_blank" rel="noopener noreferrer">[2]</a>. Acquired Flat feet happen when your arches fall flat after forming normally
                  <a href="https://my.clevelandclinic.org/health/diseases/flat-feet-pes-planus" target="_blank" rel="noopener noreferrer">[4]</a>, or abruptly after an injury
                  <a href="https://www.mayoclinic.org/diseases-conditions/flatfeet/symptoms-causes/syc-20372604" target="_blank" rel="noopener noreferrer">[3]</a>. Different medical conditions may induce congenital flat feet such as: Cerebral palsy, Clubfoot, Down Syndrome, and so on. Whereas acquired flat foot can occur due to Posterior tibial tendon dysfunction, Charcot foot, Arthritis, and Injury
                  <a href="https://my.clevelandclinic.org/health/diseases/flat-feet-pes-planus" target="_blank" rel="noopener noreferrer">[4]</a>. Moreover, Flat footed individuals are at an increased risk of Obesity, Injury to the foot or ankle, Rheumatoid arthritis, Aging, and Diabetes.
                </p>
              ) : openModal === "High" ? (
                <p>
                  High Arch, or otherwise known as Pes Cavus, is defined as when your foot arch is more raised than normal
                  <a href="https://medlineplus.gov/ency/article/001261.htm" target="_blank" rel="noopener noreferrer">[3]</a>. This can either be natural or due to a medical condition
                  <a href="https://my.clevelandclinic.org/health/diseases/high-arch-feet-pes-cavus" target="_blank" rel="noopener noreferrer">[1]</a>. Examples of such medical conditions are as follows: cerebral palsy, Charcot-Marie-Tooth disease, spina bifida, and so on
                  <a href="https://www.foothealthfacts.org/conditions/cavus-foot-(high-arched-foot)" target="_blank" rel="noopener noreferrer">[2]</a>. A high-arched foot places an excessive amount of weight on the ball and heel of the foot when walking or standing
                  <a href="https://www.foothealthfacts.org/conditions/cavus-foot-(high-arched-foot)" target="_blank" rel="noopener noreferrer">[2]</a>. If the high arch is due to a neurologic disorder or other medical condition, it is likely to progressively worsen, whereas naturally occurring cavus feet do not usually change in appearance
                  <a href="https://www.foothealthfacts.org/conditions/cavus-foot-(high-arched-foot)" target="_blank" rel="noopener noreferrer">[2]</a>.
                </p>
              ) : (
                <p>{archInfo[openModal].description}</p>
              )}
            </div>
          </div>
        )}

        {/* Symptom Section */}
        <div className="symptom-box">
          <h2>Symptoms of flat feet include the following:</h2>
          <ul>
            <li>Foot pain after walking</li>
            <li>Ankle pain from overpronation</li>
            <li>Shin splints from overcompensating</li>
          </ul>

           <h2>If left untreated the following may develop:</h2>
          <ul>
            <li>Gait disorder and abnormalities</li>
            <li>Deformities (i.e. bunions, or hammertoes)</li>
            <li>Chronic pain </li>
          </ul>
        </div>

        <div className="symptom-box">
          <h2>Symptoms of High Arch include the following:</h2>
          <ul>
            <li>Foot pain (specifically in the ball or heel area) </li>
            <li>Ankle pain and swelling</li>
            <li>Arch pain</li>
          </ul>

          <h2>In cases where this is left untreated, the person may be able to develop:</h2>
          <ul>
            <li>Corns and calluses (on areas that take more pressure)</li>
            <li>Ankle joint instability, causing it to frequently roll or sprain</li>
            <li>Inward-curling toes (otherwise known as claw toes or hammer toes)</li>
          </ul>
        </div>

      </div>
    </div>
  );
}

export default InformationPage;
