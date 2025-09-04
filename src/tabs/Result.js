        import React from 'react';
        import { useLocation, useNavigate, Link } from 'react-router-dom';
        import lofuImage from '../assets/LOGO21.png';
        import '../App.css';
        import '../components/Screen.css';
        import MainButton from '../components/MainButton';

        function ResultPage() {
        const location = useLocation();
        const navigate = useNavigate();
        const { images = [], results = [] } = location.state || {};

        const handleBack = () => navigate('/');

        const formatArchLabel = (label) => {
            switch (label) {
            case 'Flat': return 'Flat Arch';
            case 'Normal': return 'Normal Arch';
            case 'High': return 'High Arch';
            default: return label;
            }
        };

        return (
            <div className="App">
        {/* Navigation Bar*/}
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

            <div className="result-body centered">
                {images.map((img, index) => (
                <div className="result-card" key={index}>
                    <img src={img} alt={`Result ${index}`} className="result-image" />
                    <div className="prediction-details">
                    <h3>
                        Prediction: <span>{formatArchLabel(results[index])}</span>
                    </h3>
                    </div>
                </div>
                ))}

                <div className="result-actions">
                <MainButton onClick={handleBack}>Back</MainButton>
                </div>
            </div>
            </div>
        );
        }

        export default ResultPage;
