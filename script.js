const telegramBotToken = '7181676168:AAHTuOyLuI8Q1UhouYF5BWqztVBCzvH1JMM'; // Bot API kaliti
const telegramChatId = '1211791131'; // Kanal ID si

let timeLeft = 120; // 2 daqiqa

function startTimer() {
    const timerDisplay = document.getElementById('timer');
    const timer = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        timeLeft--;

        if (timeLeft < 0) {
            clearInterval(timer);
            disableForm();
            checkAnswers();
        }
    }, 1000);
}

function disableForm() {
    const formElements = document.getElementById('quizForm').elements;
    for (let i = 0; i < formElements.length; i++) {
        formElements[i].disabled = true;
    }
}

function checkAnswers() {
    const form = document.getElementById('quizForm');
    const result = document.getElementById('result');
    const correctAnswersDisplay = document.getElementById('correctAnswers');
    const percentageDisplay = document.getElementById('percentage');
    const adviceDisplay = document.getElementById('advice');

    const correctAnswers = {
        q1: '1',
        q2: '1'
    };

    let score = 0;
    let totalQuestions = 0;
    let incorrectQuestions = [];

    for (const [key, value] of Object.entries(correctAnswers)) {
        totalQuestions++;
        const questionElement = document.getElementById(`question${key.slice(1)}`);
        const selected = form.elements[key].value;

        if (selected === value) {
            score++;
            questionElement.classList.add('correct');
        } else {
            questionElement.classList.add('incorrect');
            incorrectQuestions.push({
                question: questionElement.querySelector('p').textContent,
                yourAnswer: form.elements[key].value,
                correctAnswer: value
            });
        }
    }

    const percentage = (score / totalQuestions) * 100;

    correctAnswersDisplay.textContent = score;
    percentageDisplay.textContent = percentage.toFixed(2);

    result.style.display = 'block';

    // To'g'ri javoblarni ko'rsatish
    for (const [key, value] of Object.entries(correctAnswers)) {
        const questionElement = document.getElementById(`question${key.slice(1)}`);
        const correctAnswerElement = questionElement.querySelector(`input[value="${value}"]`);
        correctAnswerElement.parentElement.classList.add('highlight');
    }

    // Foydalanuvchiga tavsiya berish
    let advice;
    if (percentage >= 80) {
        advice = "Tabriklaymiz! Siz kursni davom ettirishingiz mumkin.";
        adviceDisplay.style.color = "green";
    } else {
        advice = "Afsuski, siz kursni qayta o'qishingiz kerak.";
        adviceDisplay.style.color = "red";
    }
    adviceDisplay.textContent = advice;

    // Testni bir marta yechganligini saqlash
    localStorage.setItem('testCompleted', 'true');
    disableForm();

    // Natijalarni Telegramga yuborish
    const userName = localStorage.getItem('userName');
    sendResultsToTelegram(userName, score, percentage.toFixed(2), advice, incorrectQuestions);
}

function checkIfTestCompleted() {
    const testCompleted = localStorage.getItem('testCompleted');
    if (testCompleted === 'true') {
        document.getElementById('quizForm').style.display = 'none';
        const adviceDisplay = document.getElementById('advice');
        adviceDisplay.textContent = "Siz allaqachon testni yechganingiz uchun qayta yecholmaysiz.";
        adviceDisplay.style.color = "blue";
        document.getElementById('result').style.display = 'block';

        // Foydalanuvchi ismini ko'rsatish
        const userName = localStorage.getItem('userName');
        if (userName) {
            document.getElementById('userGreeting').textContent = `${userName}, sizning natijalaringiz:`;
        }
    } else {
        startTimer();
    }
}

function startTest() {
    const nameInput = document.getElementById('nameInput').value.trim();
    if (nameInput) {
        localStorage.setItem('userName', nameInput);
        document.getElementById('nameSection').style.display = 'none';
        document.getElementById('quizForm').style.display = 'block';
        startTimer();
    } else {
        alert('Iltimos, ismingizni kiriting.');
    }
}

function sendResultsToTelegram(userName, score, percentage, advice, incorrectQuestions) {
    let incorrectQuestionsText = '';
    if (incorrectQuestions.length > 0) {
        incorrectQuestionsText = '\nXato qilingan savollar:\n';
        incorrectQuestions.forEach((item, index) => {
            incorrectQuestionsText += `${index + 1}. ${item.question}\nSizning javobingiz: ${item.yourAnswer}\nTo'g'ri javob: ${item.correctAnswer}\n\n`;
        });
    }

    const message = `${userName} testni yakunladi. Natija: ${score} to'g'ri javob, ${percentage}%. ${advice}${incorrectQuestionsText}`;
    const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage?chat_id=${telegramChatId}&text=${encodeURIComponent(message)}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.ok) {
                console.log('Natijalar muvaffaqiyatli yuborildi');
            } else {
                console.error('Natijalarni yuborishda xatolik yuz berdi:', data);
            }
        })
        .catch(error => console.error('Telegram API xatosi:', error));
}

checkIfTestCompleted();
