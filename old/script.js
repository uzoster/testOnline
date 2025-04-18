const telegramBotToken = '7181676168:AAHTuOyLuI8Q1UhouYF5BWqztVBCzvH1JMM';
const telegramChatId = '1211791131';
const reattemptTime = 3 * 60 * 60 * 1000;
let timeLeft = 120;
let startTime;
let timer;
let questions = [];
let currentQuestionIndex = 0;
let answers = [];
let currentUser = null;

// Escape HTML characters to display tags as text
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Display error messages
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

// Hide error messages
function hideError() {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.classList.add('hidden');
}

// Initialize event listeners after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('passwordInput');
    
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const toggleIcon = togglePassword.querySelector('i');
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleIcon.classList.remove('fa-eye');
                toggleIcon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                toggleIcon.classList.remove('fa-eye-slash');
                toggleIcon.classList.add('fa-eye');
            }
        });
    } else {
        console.error('togglePassword yoki passwordInput elementi topilmadi');
    }
});

// Login function
async function login() {
    const username = document.getElementById('usernameInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();

    // Hide any existing error message before proceeding
    hideError();

    if (!username || !password) {
        showError('Iltimos, login va parolni kiriting.');
        return;
    }

    try {
        const response = await fetch('students.json');
        if (!response.ok) {
            showError('students.json faylni yuklashda xato');
            return;
        }
        const students = await response.json();

        const user = students.find(s => s.username === username && s.password === password);
        if (!user) {
            showError('Noto‘g‘ri login yoki parol.');
            return;
        }

        currentUser = user;
        localStorage.setItem('userName', user.name);
        if (checkReattempt(user.name)) {
            localStorage.setItem(`${user.name}_lastAttempt`, Date.now());
            await loadTests(user.group);
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('timerSection').classList.remove('hidden');
            document.getElementById('quizForm').style.display = 'block';
            startTimer();
        }
    } catch (error) {
        showError(`Kirishda xato: ${error.message}`);
        return;
    }
}

// Load tests based on group
async function loadTests(group) {
    try {
        const response = await fetch('tests.json');
        if (!response.ok) {
            showError('tests.json faylni yuklashda xato');
            return;
        }
        const tests = await response.json();
        questions = tests.find(t => t.group === group)?.questions || [];
        if (questions.length === 0) {
            showError(`"${group}" guruhiga mos testlar topilmadi`);
            return;
        }
        questions.forEach((q, i) => {
            if (!q.question || !Array.isArray(q.options) || q.options.length < 2 || !q.options.some(opt => opt.correct)) {
                showError(`Savol ${i + 1} noto‘g‘ri formatda`);
                return;
            }
        });
        renderQuestion();
    } catch (error) {
        showError(`Testlarni yuklashda xato: ${error.message}`);
        return;
    }
}

// Render the current question
function renderQuestion() {
    const quizForm = document.getElementById('quizForm');
    const questionContainer = document.getElementById('questionContainer');
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');

    if (!questions[currentQuestionIndex]) return;

    const q = questions[currentQuestionIndex];
    questionContainer.innerHTML = `
        <div id="question${currentQuestionIndex + 1}" class="question-card bg-gray-50 p-4 sm:p-6 mb-4 rounded-lg fade-in">
            <p class="font-semibold mb-3 text-sm sm:text-base"><i class="fas fa-question-circle mr-2"></i> ${currentQuestionIndex + 1}. ${escapeHTML(q.question)}</p>
            ${q.options.map((option, i) => `
                <label class="block mb-2">
                    <input type="radio" name="q${currentQuestionIndex + 1}" value="${i}" class="mr-2" ${answers[currentQuestionIndex] === i.toString() ? 'checked' : ''}>
                    ${escapeHTML(option.text)}
                </label>
            `).join('')}
        </div>
    `;

    prevButton.disabled = currentQuestionIndex === 0;
    nextButton.disabled = currentQuestionIndex === questions.length - 1;
    nextButton.textContent = currentQuestionIndex === questions.length - 1 ? 'Yakunlash' : 'Keyingi';
}

// Save answer when navigating
function saveAnswer() {
    const selected = document.querySelector(`input[name="q${currentQuestionIndex + 1}"]:checked`);
    if (selected) {
        answers[currentQuestionIndex] = selected.value;
    }
}

// Navigate to previous question
function previousQuestion() {
    if (currentQuestionIndex > 0) {
        saveAnswer();
        currentQuestionIndex--;
        renderQuestion();
    }
}

// Navigate to next question
function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        saveAnswer();
        currentQuestionIndex++;
        renderQuestion();
    } else {
        saveAnswer();
        checkAnswers();
    }
}

// Check if user can retake the quiz
function checkReattempt(name) {
    const lastAttemptTime = localStorage.getItem(`${name}_lastAttempt`);
    if (lastAttemptTime) {
        const currentTime = Date.now();
        const timeElapsed = currentTime - lastAttemptTime;

        if (timeElapsed < reattemptTime) {
            const remainingTime = reattemptTime - timeElapsed;
            const hours = Math.floor(remainingTime / (1000 * 60 * 60));
            const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);
            showError(`Siz testni yechganingiz uchun ${hours} soat ${minutes} minut ${seconds} soniya kuting.`);
            return false;
        }
    }
    return true;
}

// Start the timer
function startTimer() {
    startTime = Date.now();
    const timerDisplay = document.getElementById('timer');
    const progressBar = document.getElementById('progress');
    const totalTime = 120;

    timer = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        const progressPercentage = ((totalTime - timeLeft) / totalTime) * 100;
        progressBar.style.width = `${progressPercentage}%`;
        if (timeLeft <= 10) {
            timerDisplay.classList.add('text-red-600', 'pulse');
        }
        timeLeft--;

        if (timeLeft < 0) {
            clearInterval(timer);
            disableForm();
            checkAnswers();
        }
    }, 1000);
}

// Disable the form
function disableForm() {
    const formElements = document.getElementById('quizForm').elements;
    for (let i = 0; i < formElements.length; i++) {
        formElements[i].disabled = true;
    }
}

// Send results to Telegram with retry logic
async function sendToTelegram(message) {
    const maxLength = 4000;
    const truncatedMessage = message.length > maxLength ? message.substring(0, maxLength) + '...' : message;

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
                method: 'POST',
                body: JSON.stringify({
                    chat_id: telegramChatId,
                    text: truncatedMessage,
                    parse_mode: 'HTML'
                }),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (data.ok) {
                console.log('Natijalar muvaffaqiyatli yuborildi');
                return true;
            } else {
                console.error(`Telegram xatosi (urinish ${attempt}):`, data);
                if (attempt === 3) {
                    showError('Telegramga natija yuborishda xato: ' + (data.description || 'Noma’lum xato'));
                }
            }
        } catch (error) {
            console.error(`Telegram API xatosi (urinish ${attempt}):`, error);
            if (attempt === 3) {
                showError('Telegram bilan bog‘lanishda xato: ' + error.message);
            }
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return false;
}

// Check answers and display results
function checkAnswers() {
    clearInterval(timer);
    const form = document.getElementById('quizForm');
    const result = document.getElementById('result');
    const correctAnswersDisplay = document.getElementById('correctAnswers');
    const percentageDisplay = document.getElementById('percentage');
    const adviceDisplay = document.getElementById('advice');
    const timeSpentDisplay = document.getElementById('timeSpent');

    saveAnswer();

    let score = 0;
    let totalQuestions = questions.length;
    let incorrectQuestions = [];

    questions.forEach((q, index) => {
        const questionElement = document.getElementById(`question${index + 1}`);
        const selectedIndex = answers[index];
        const correctIndex = q.options.findIndex(opt => opt.correct);

        if (selectedIndex !== undefined && parseInt(selectedIndex) === correctIndex) {
            score++;
            if (questionElement) questionElement.classList.add('correct');
        } else {
            if (questionElement) questionElement.classList.add('incorrect');
            incorrectQuestions.push({
                question: q.question,
                yourAnswer: selectedIndex !== undefined ? q.options[selectedIndex].text : 'Javob tanlanmadi',
                correctAnswer: q.options[correctIndex].text
            });
        }

        if (questionElement) {
            const correctAnswerElement = document.getElementById(`question${index + 1}`).querySelector(`input[value="${correctIndex}"]`);
            if (correctAnswerElement) correctAnswerElement.parentElement.classList.add('highlight');
        }
    });

    const percentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;
    const timeSpent = Math.round((Date.now() - startTime) / 1000);

    correctAnswersDisplay.textContent = score;
    percentageDisplay.textContent = percentage.toFixed(2);
    timeSpentDisplay.textContent = timeSpent;
    result.classList.remove('hidden');
    form.style.display = 'none';

    let advice;
    if (percentage >= 70) {
        advice = "Tabriklaymiz! Siz kursni davom ettirishingiz mumkin.";
        adviceDisplay.style.color = "#28a745";
    } else {
        advice = "Afsuski, siz kursni qayta o'qishingiz kerak.";
        adviceDisplay.style.color = "#dc3545";
    }
    adviceDisplay.textContent = advice;

    const userName = localStorage.getItem('userName') || 'Foydalanuvchi';
    document.getElementById('userGreeting').textContent = `${userName}, sizning natijalaringiz:`;

    if (typeof Chart !== 'undefined') {
        const ctx = document.getElementById('chart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ["To'g'ri", "Noto'g'ri"],
                datasets: [{
                    data: [score, totalQuestions - score],
                    backgroundColor: ['#28a745', '#dc3545'],
                    borderColor: ['#1e7e34', '#c82333'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' }
                }
            }
        });
    } else {
        document.getElementById('resultChart').innerHTML = '<p class="text-center text-red-600 text-sm">Natija grafikasi yuklanmadi.</p>';
    }

    const incorrectAnswersText = incorrectQuestions.map(q => 
        `Savol: ${escapeHTML(q.question)}\nSizning javobingiz: ${escapeHTML(q.yourAnswer)}\nTo'g'ri javob: ${escapeHTML(q.correctAnswer)}`
    ).join('\n\n');
    const telegramMessage = `<b>Foydalanuvchi:</b> ${userName}\n<b>Guruh:</b> ${currentUser.group}\n<b>To'g'ri javoblar:</b> ${score}\n<b>Foiz:</b> ${percentage.toFixed(2)}%\n<b>Sarflangan vaqt:</b> ${timeSpent} soniya\n\n<b>Xato javoblar:</b>\n${incorrectAnswersText || 'Xato javoblar yo‘q'}`;

    sendToTelegram(telegramMessage);
}

// Check if test was previously completed
function checkIfTestCompleted() {
    const userName = localStorage.getItem('userName');
    const lastAttemptTime = localStorage.getItem(`${userName}_lastAttempt`);
    if (lastAttemptTime && (Date.now() - lastAttemptTime) < reattemptTime) {
        document.getElementById('quizForm').style.display = 'none';
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('timerSection').style.display = 'none';
        document.getElementById('result').classList.remove('hidden');
        document.getElementById('advice').textContent = "Siz testni yechganingiz uchun qayta yecholmaysiz.";
        document.getElementById('advice').style.color = "#007BFF";
        if (userName) {
            document.getElementById('userGreeting').textContent = `${userName}, sizning natijalaringiz:`;
        }
    }
}

// Initialize
checkIfTestCompleted();