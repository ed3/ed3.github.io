let urls = new URLSearchParams(window.location.search);
const levelToFile = {"5": "data/jlpt5.txt","4": "data/jlpt4.txt","3": "data/jlpt3.txt","2": "data/jlpt2.txt"};
window.quizSession = {quizMap: {},indexMap: {}};
async function loadQuizData(level) {
    const filePath = levelToFile[level] || levelToFile['5'];
    const list = [];
    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`No file: ${filePath}`);
        const data = await response.text();
        const lines = data.split(/\r?\n/);
        for (const line of lines) {
            if (!line.trim()) continue;
            const arr = line.split(',', 4);
            if (arr.length === 4) {
                list.push({kanji: arr[0].trim(),hiragana: arr[1].trim(),reading: arr[2].trim(),meaning: arr[3].trim()});
            }
        }
    } catch (err) {
        console.error(`Error level ${level}:`, err.message);
    }
    return list;
}
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
async function initQuiz(level) {
    const list = await loadQuizData(level);
    const no = urls.get("no") || 10;
    shuffle(list);
    window.quizSession.quizMap[level] = list.slice(0, Math.min(no, list.length));
    window.quizSession.indexMap[level] = 0;
}
async function getNextKanji(level = '5') {
    if (!window.quizSession.quizMap[level]) {
        await initQuiz(level);
    }
    const quizList = window.quizSession.quizMap[level] || [];
    const idx = window.quizSession.indexMap[level] || 0;
    if (quizList.length === 0 || idx >= quizList.length) {
        return null;
    }
    window.quizSession.indexMap[level] = idx + 1;
    return quizList[idx];
}
let currentKanjiObj = null, score = 0, total = 0, isAnswered = false, isQuizFinished = false;
const level = urls.get("level") || "5", type = urls.get("type") || "r";
const answerInput = document.getElementById("answer");
if (answerInput) {
    answerInput.placeholder = type === "h" ? "ひらがなで入力" : "ローマ字で入力";
}
async function loadQuestion() {
    document.getElementById("result").textContent = "";
    document.getElementById("meaning").textContent = "";
    document.getElementById("answer").value = "";
    document.getElementById("answer").disabled = false;
    isAnswered = false;
    const btn = document.querySelector("button");
    btn.textContent = "送信";
    btn.onclick = submitAnswer;
    try {
        const data = await getNextKanji(level);
        if (!data || !data.kanji) return finishQuiz();
        currentKanjiObj = data;
        document.getElementById("kanji").textContent = currentKanjiObj.kanji;
        document.getElementById("answer").focus();
    } catch (e) {
        console.error("loadQuestion() error:", e);
        finishQuiz();
    }
}
async function finishQuiz() {
    if (isQuizFinished) return; 
    isQuizFinished = true;
    document.getElementById("kanji").textContent = "終了！";
    document.getElementById("answer").style.display = "none";
    document.querySelector("button").style.display = "none";
    document.getElementById("result").textContent = `パーセンテージ ${total > 0 ? Math.round((score / total) * 100) : 0}%`;
    const retryBtn = document.createElement("button");
    retryBtn.textContent = "もう一度";
    retryBtn.onclick = () => {location.reload();};
    document.getElementById("stats").appendChild(retryBtn);
}
function submitAnswer() {
    if (isAnswered || isQuizFinished || !currentKanjiObj) return;
    const userAnswer = document.getElementById("answer").value.trim().toLowerCase();
    if (!userAnswer) return;
    total++;
    isAnswered = true;
    document.getElementById("answer").disabled = true;
    const correctAnswer = type === "h" ? currentKanjiObj.hiragana : currentKanjiObj.reading;
    const displayCorrectAnswer = currentKanjiObj.hiragana + (type === "h" ?  ``:` (${currentKanjiObj.reading})`);
    if (userAnswer === correctAnswer.toLowerCase()) {
        score++;
        document.getElementById("result").textContent = "⭕ 正解！";
    } else {
        document.getElementById("result").textContent = `❌ 不正解！ 正答: ${displayCorrectAnswer}`;
    }
    document.getElementById("meaning").textContent = `${currentKanjiObj.meaning || '—'}`;
    document.getElementById("score").textContent = score;
    document.getElementById("total").textContent = total;
    const btn = document.querySelector("button");
    btn.textContent = "次へ";
    btn.onclick = loadQuestion;
}
window.onload = function () {
    loadQuestion();
    document.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            if (isQuizFinished) return;
            if (!isAnswered) submitAnswer();
            else loadQuestion();
        }
    });
};