import { useState } from 'react';
import './App.css';
import { useNavigate } from 'react-router-dom';
import MainButton from './components/MainButton';

function App() {
  const [selectedImage, setSelectedImage] = useState(null);  // Add a state for selected image
  const [classificationResult, setClassificationResult] = useState(null);
  const navigate = useNavigate();

  // Handle image upload
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
        setClassificationResult(null); // Reset previous classification result
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle classification of the uploaded image
  const handleClassify = async () => {
    if (!selectedImage) {
      alert('Please upload an image first.');
      return;
    }

    try {
      const res = await fetch('http://127.0.0.1:5000/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: selectedImage }),
      });

      const data = await res.json();
      setClassificationResult({
        prediction: data.prediction || 'Unknown',
      });

      // Navigate to the result page
      navigate('/result', {
        state: { images: [selectedImage], results: [data.prediction] },
      });
    } catch (err) {
      console.error('Classification error:', err);
      alert('Classification failed. Please try again.');
    }
  };

  // Handle the option to upload a new image
  const handleNewUpload = () => {
    setSelectedImage(null); // Clear the selected image
    setClassificationResult(null); // Clear the classification result
  };

  return (
    <div className="App">
      <div className="main-body-vertical">
        <div className="left-section">
          <div className="upload-container">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="upload-input"
            />
            {selectedImage && (
              <div className="uploaded-image">
                <img src={selectedImage} alt="Uploaded" className="uploaded-preview" />
              </div>
            )}
          </div>
          <div className="classify-btn-container">
            <MainButton onClick={handleClassify}>Classify Image</MainButton>
          </div>

          {classificationResult && (
            <div className="classification-result">
              <p><strong>Prediction:</strong> {classificationResult.prediction}</p>
            </div>
          )}

          {/* Button to allow user to upload another image after classification */}
          {classificationResult && (
            <div className="new-upload-btn-container">
              <MainButton onClick={handleNewUpload}>Upload Another Image</MainButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
