#!/usr/bin/env python3
"""
ML Model Training and Prediction
Train Random Forest en XGBoost modellen voor trading signalen
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib
import os

try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    print("⚠️  XGBoost not available, using Random Forest only")

from ml_features import MLFeatureEngineer

class MLTradingModel:
    def __init__(self, model_type: str = 'random_forest', model_path: Optional[str] = None):
        """
        Initialize ML Trading Model
        
        Args:
            model_type: 'random_forest' or 'xgboost'
            model_path: Path to saved model (optional)
        """
        self.model_type = model_type
        self.feature_engineer = MLFeatureEngineer()
        self.model = None
        self.trained = False
        self.feature_names = []
        self.training_metrics = {}
        
        if model_path and os.path.exists(model_path):
            self.load_model(model_path)
        else:
            self._initialize_model()
    
    def _initialize_model(self):
        """Initialize model based on type"""
        if self.model_type == 'random_forest':
            self.model = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1
            )
        elif self.model_type == 'xgboost' and XGBOOST_AVAILABLE:
            self.model = xgb.XGBClassifier(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                random_state=42,
                n_jobs=-1
            )
        else:
            if self.model_type == 'xgboost':
                print("⚠️  XGBoost not available, falling back to Random Forest")
            self.model_type = 'random_forest'
            self.model = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                random_state=42,
                n_jobs=-1
            )
    
    def prepare_training_data(self, historical_candles: List[List[Dict]], 
                            labels: List[str]) -> Tuple[np.ndarray, np.ndarray]:
        """
        Prepare training data from historical candles and labels
        
        Args:
            historical_candles: List of candle sequences (each sequence is a list of candles)
            labels: List of labels ('BUY', 'SELL', 'NEUTRAL')
        
        Returns:
            (X, y) tuple
        """
        X = []
        y = []
        
        for i, candles in enumerate(historical_candles):
            if i >= len(labels):
                break
            
            features = self.feature_engineer.extract_features(candles)
            if features:
                # Get feature names on first iteration
                if not self.feature_names:
                    self.feature_names = list(features.keys())
                
                # Create feature vector in consistent order
                feature_vector = [features.get(name, 0) for name in self.feature_names]
                X.append(feature_vector)
                
                # Convert label to numeric
                label = labels[i]
                if label == 'BUY':
                    y.append(1)
                elif label == 'SELL':
                    y.append(-1)
                else:
                    y.append(0)
        
        return np.array(X), np.array(y)
    
    def train(self, X: np.ndarray, y: np.ndarray, test_size: float = 0.2) -> Dict:
        """
        Train the ML model
        
        Args:
            X: Feature matrix
            y: Label array
            test_size: Proportion of data for testing
        
        Returns:
            Training metrics
        """
        if len(X) == 0 or len(y) == 0:
            return {'error': 'No training data provided'}
        
        print(f"\n{'='*70}")
        print(f"🤖 TRAINING ML MODEL ({self.model_type.upper()})")
        print(f"{'='*70}")
        print(f"Training samples: {len(X)}")
        print(f"Features: {X.shape[1] if len(X.shape) > 1 else 1}")
        print()
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=y
        )
        
        print(f"Train set: {len(X_train)} samples")
        print(f"Test set: {len(X_test)} samples")
        print()
        
        # Train model
        print("🔄 Training model...")
        self.model.fit(X_train, y_train)
        
        # Evaluate
        train_score = self.model.score(X_train, y_train)
        test_score = self.model.score(X_test, y_test)
        
        # Predictions
        y_train_pred = self.model.predict(X_train)
        y_test_pred = self.model.predict(X_test)
        
        # Classification report
        train_report = classification_report(y_train, y_train_pred, output_dict=True, zero_division=0)
        test_report = classification_report(y_test, y_test_pred, output_dict=True, zero_division=0)
        
        # Confusion matrix
        train_cm = confusion_matrix(y_train, y_train_pred)
        test_cm = confusion_matrix(y_test, y_test_pred)
        
        self.training_metrics = {
            'train_accuracy': train_score,
            'test_accuracy': test_score,
            'train_report': train_report,
            'test_report': test_report,
            'train_confusion_matrix': train_cm.tolist(),
            'test_confusion_matrix': test_cm.tolist()
        }
        
        self.trained = True
        
        print("✅ Training completed!")
        print(f"  Train Accuracy: {train_score:.2%}")
        print(f"  Test Accuracy: {test_score:.2%}")
        print()
        print("Test Set Classification Report:")
        print(classification_report(y_test, y_test_pred, zero_division=0))
        
        return self.training_metrics
    
    def predict(self, candles: List[Dict]) -> Dict:
        """
        Predict trading signal from current candles
        
        Args:
            candles: List of candlestick data
        
        Returns:
            Prediction dict with signal, confidence, and probabilities
        """
        if not self.trained:
            return {
                'signal': 'NEUTRAL',
                'confidence': 0,
                'error': 'Model not trained'
            }
        
        # Extract features
        features = self.feature_engineer.extract_features(candles)
        if not features:
            return {
                'signal': 'NEUTRAL',
                'confidence': 0,
                'error': 'Could not extract features'
            }
        
        # Create feature vector
        if not self.feature_names:
            self.feature_names = list(features.keys())
        
        feature_vector = np.array([[features.get(name, 0) for name in self.feature_names]])
        
        # Predict
        prediction = self.model.predict(feature_vector)[0]
        probabilities = self.model.predict_proba(feature_vector)[0]
        
        # Map prediction to signal
        if prediction == 1:
            signal = 'BUY'
        elif prediction == -1:
            signal = 'SELL'
        else:
            signal = 'NEUTRAL'
        
        # Get confidence (max probability)
        confidence = float(max(probabilities)) * 100
        
        # Map probabilities to signal names
        classes = self.model.classes_
        prob_dict = {}
        for i, cls in enumerate(classes):
            if cls == 1:
                prob_dict['BUY'] = float(probabilities[i])
            elif cls == -1:
                prob_dict['SELL'] = float(probabilities[i])
            else:
                prob_dict['NEUTRAL'] = float(probabilities[i])
        
        return {
            'signal': signal,
            'confidence': round(confidence, 2),
            'probabilities': prob_dict,
            'prediction': int(prediction),
            'features_used': len(self.feature_names)
        }
    
    def save_model(self, filepath: str):
        """Save trained model to file"""
        if not self.trained:
            raise ValueError("Model not trained yet")
        
        model_data = {
            'model': self.model,
            'model_type': self.model_type,
            'feature_names': self.feature_names,
            'training_metrics': self.training_metrics,
            'trained': self.trained
        }
        
        joblib.dump(model_data, filepath)
        print(f"✅ Model saved to {filepath}")
    
    def load_model(self, filepath: str):
        """Load trained model from file"""
        model_data = joblib.load(filepath)
        
        self.model = model_data['model']
        self.model_type = model_data.get('model_type', 'random_forest')
        self.feature_names = model_data.get('feature_names', [])
        self.training_metrics = model_data.get('training_metrics', {})
        self.trained = model_data.get('trained', False)
        
        print(f"✅ Model loaded from {filepath}")
        print(f"   Type: {self.model_type}")
        print(f"   Features: {len(self.feature_names)}")
        print(f"   Trained: {self.trained}")

if __name__ == "__main__":
    # Test ML model
    print("🧪 Testing ML Model...")
    
    model = MLTradingModel(model_type='random_forest')
    print(f"✅ Model initialized: {model.model_type}")
    print(f"   Trained: {model.trained}")
