const correctPassword = "2812";
const checkBtn = document.getElementById("check-btn");
const goBtn = document.getElementById("go-btn");
const answer = document.getElementById("answer");

checkBtn.addEventListener("click", () => {
    if(answer.value === correctPassword) {
        goBtn.classList.add("show");
        alert("Урааа! Пароль правильний! 💖 Натисни \"Далі!\"");
    }
    else {
        alert("Пароль неправильний 😢");
    }
});