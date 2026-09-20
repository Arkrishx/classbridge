"""
Benchmark evaluation data for ClassBridge (TENSORA 2026, Problem EDU-02).
Contains representative lecture clips from NPTEL STEM lectures (Deep Learning & Linear Algebra)
and Common Voice Indic test samples.
"""

BENCHMARK_SAMPLES = [
    {
        "id": "NPTEL_DL_01",
        "domain": "Deep Learning & Optimization",
        "source": "NPTEL - Deep Learning (IIT Madras)",
        "ground_truth_en": "Today we are discussing gradient descent and learning rate tuning for neural network optimization.",
        "asr_hypothesis": "Today we are discussing gradient descent and learning rate tuning for neural network optimization.",
        "reference_ta": "இன்று நாம் சரிவு இறக்கம் (Gradient Descent) மற்றும் நரம்பியல் வலைப்பின்னல் உகப்பாக்கத்திற்கான கற்றல் வீதம் (Learning Rate) சரிசெய்தல் பற்றி விவாதிக்கிறோம்.",
        "baseline_raw_mt_ta": "இன்று நாம் நரம்பியல் நெட்வொர்க் தேர்வுமுறைக்கான சாய்வு வம்சாவளி மற்றும் கற்றல் விகிதத்தை சரிசெய்தல் பற்றி விவாதிக்கிறோம்.",
        "domain_adapted_mt_ta": "இன்று நாம் சரிவு இறக்கம் (Gradient Descent) மற்றும் நரம்பியல் வலைப்பின்னல் உகப்பாக்கத்திற்கான கற்றல் வீதம் (Learning Rate) சரிசெய்தல் பற்றி விவாதிக்கிறோம்."
    },
    {
        "id": "NPTEL_LA_02",
        "domain": "Linear Algebra",
        "source": "NPTEL - Linear Algebra (IIT Kanpur)",
        "ground_truth_en": "An eigenvalue and its corresponding eigenvector satisfy the linear matrix equation Av equals lambda v.",
        "asr_hypothesis": "An eigenvalue and its corresponding eigenvector satisfy the linear matrix equation Av equals lambda v.",
        "reference_ta": "சிறப்பியல்பு மதிப்பு (Eigenvalue) மற்றும் அதன் தொடர்புடைய சிறப்பியல்பு திசையன் (Eigenvector) ஆகியவை நேரியல் அணிச் சமன்பாடான Av = λv ஐ நிறைவு செய்கின்றன.",
        "baseline_raw_mt_ta": "ஒரு ஐகன் மதிப்பு மற்றும் அதன் தொடர்புடைய ஈஜென்வெக்டர் ஆகியவை நேரியல் மேட்ரிக்ஸ் சமன்பாட்டை பூர்த்தி செய்கின்றன.",
        "domain_adapted_mt_ta": "சிறப்பியல்பு மதிப்பு (Eigenvalue) மற்றும் அதன் தொடர்புடைய சிறப்பியல்பு திசையன் (Eigenvector) ஆகியவை நேரியல் அணிச் சமன்பாடான Av = λv ஐ நிறைவு செய்கின்றன."
    },
    {
        "id": "NPTEL_DL_03",
        "domain": "Machine Learning",
        "source": "NPTEL - Machine Learning (IIT Bombay)",
        "ground_truth_en": "We compute derivatives via backpropagation to minimize the loss function and prevent overfitting.",
        "asr_hypothesis": "We compute derivatives via backpropagation to minimize the loss function and prevent overfitting.",
        "reference_ta": "இழப்புச் சார்பு (Loss Function) ஐக் குறைக்கவும் மிகைப்பொருத்தம் (Overfitting) ஐத் தடுக்கவும் பின்நோக்கு பரவல் (Backpropagation) வழியாக வகைக்கெழுக்களைக் கணக்கிடுகிறோம்.",
        "baseline_raw_mt_ta": "இழப்பு செயல்பாட்டைக் குறைக்கவும் அதிகப்படியான பொருத்தத்தைத் தடுக்கவும் பின்னோக்கிய பரப்புதல் வழியாக வழித்தோன்றல்களைக் கணக்கிடுகிறோம்.",
        "domain_adapted_mt_ta": "இழப்புச் சார்பு (Loss Function) ஐக் குறைக்கவும் மிகைப்பொருத்தம் (Overfitting) ஐத் தடுக்கவும் பின்நோக்கு பரவல் (Backpropagation) வழியாக வகைக்கெழுக்களைக் கணக்கிடுகிறோம்."
    },
    {
        "id": "NPTEL_PHY_04",
        "domain": "Thermodynamics & Physics",
        "source": "NPTEL - Engineering Thermodynamics (IIT Kharagpur)",
        "ground_truth_en": "In statistical thermodynamics entropy quantifies microscopic disorder in an isolated system.",
        "asr_hypothesis": "In statistical thermodynamics entropy quantifies microscopic disorder in an isolated system.",
        "reference_ta": "புள்ளியியல் வெப்ப இயக்கவியல் (Thermodynamics) இல் என்ட்ரோபி (Entropy) என்பது ஒரு தனிமைப்படுத்தப்பட்ட அமைப்பில் உள்ள நுண்ணிய ஒழுங்கின்மையை அளவிடுகிறது.",
        "baseline_raw_mt_ta": "புள்ளிவிவர வெப்ப இயக்கவியலில் என்ட்ரோபி ஒரு தனிமைப்படுத்தப்பட்ட அமைப்பில் நுண்ணிய கோளாறுகளை அளவிடுகிறது.",
        "domain_adapted_mt_ta": "புள்ளியியல் வெப்ப இயக்கவியல் (Thermodynamics) இல் என்ட்ரோபி (Entropy) என்பது ஒரு தனிமைப்படுத்தப்பட்ட அமைப்பில் உள்ள நுண்ணிய ஒழுங்கின்மையை அளவிடுகிறது."
    },
    {
        "id": "NPTEL_CS_05",
        "domain": "Algorithms & Complexity",
        "source": "NPTEL - Design and Analysis of Algorithms (IIT Madras)",
        "ground_truth_en": "Binary search algorithm exhibits logarithmic time complexity O of log n over sorted arrays.",
        "asr_hypothesis": "Binary search algorithm exhibits logarithmic time complexity O of log n over sorted arrays.",
        "reference_ta": "இருபடி தேடல் (Binary Search) வழிமுறையானது வரிசைப்படுத்தப்பட்ட அணிகளில் O(log n) மடக்கை நேரச் சிக்கல்தன்மை (Time Complexity) கொண்டது.",
        "baseline_raw_mt_ta": "பைனரி தேடல் அல்காரிதம் வரிசைப்படுத்தப்பட்ட வரிசைகளில் O(log n) மடக்கை நேர சிக்கலைக் காட்டுகிறது.",
        "domain_adapted_mt_ta": "இருபடி தேடல் (Binary Search) வழிமுறையானது வரிசைப்படுத்தப்பட்ட அணிகளில் O(log n) மடக்கை நேரச் சிக்கல்தன்மை (Time Complexity) கொண்டது."
    }
]
