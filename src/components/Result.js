import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

function ResultPage() {
  const { state } = useLocation();
  const { images, results } = state || { images: [], results: [] };
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!images || images.length === 0) {
      navigate('/'); // Redirect back to home if no images found
    }
  }, [images, navigate]);

  // Navigate to the first or previous image
  const handlePrevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  // Navigate to the next image
  const handleNextImage = () => {
    if (currentImageIndex < images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  // Button to allow user to upload a new image
  const handleNewUpload = () => {
    navigate('/'); // Navigate back to the upload page
  };

  return (
    <div className="results-page">
      {images.length > 0 && (
        <div className="result-item">
          <img
            src={images[currentImageIndex]}
            alt={`Captured ${currentImageIndex}`}
            className="result-image"
          />
          {results[currentImageIndex] ? (
            <>
              <p><strong>Prediction:</strong> {results[currentImageIndex]}</p>
            </>
          ) : (
            <p>Loading...</p>
          )}
        </div>
      )}

      <div className="navigation-buttons">
        <button onClick={handlePrevImage} disabled={currentImageIndex === 0}>
          Previous
        </button>
        <button onClick={handleNextImage} disabled={currentImageIndex === images.length - 1}>
          Next
        </button>
      </div>

      {/* Button to upload another image */}
      <div className="new-upload-btn-container">
        <button onClick={handleNewUpload}>Upload Another Image</button>
      </div>
    </div>
  );
}

export default ResultPage;
