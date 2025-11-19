const heartTypes = ['💖','💗','💘','💝','❤️','💞','💕'];
const animationTypes = ['fall1', 'fall2', 'fall3', 'fall4'];

function createHeart() {
    const heart = document.createElement('div');
    heart.classList.add('heart');

    heart.innerHTML = heartTypes[Math.floor(Math.random() * heartTypes.length)];

    // Рандомна позиція по ширині
    heart.style.left = Math.random() * window.innerWidth + 'px';
    
    // Рандомна позиція зверху (трохи вище видимої області)
    heart.style.top = (Math.random() * 50 - 100) + 'px';
    
    // Рандомний розмір
    heart.style.fontSize = (10 + Math.random() * 40) + 'px';
    
    // Рандомний колір
    heart.style.color = `hsl(${Math.random() * 360}, 100%, 70%)`;
    
    // Рандомна анімація
    const randomAnimation = animationTypes[Math.floor(Math.random() * animationTypes.length)];
    const randomDuration = (3 + Math.random() * 6) + 's';
    
    heart.style.animation = `${randomAnimation} ${randomDuration} linear forwards`;
    
    document.body.appendChild(heart);

    // Видали серце після завершення анімації
    setTimeout(() => {
       heart.remove(); 
    }, (3 + 6) * 1000); // Максимальна тривалість
}

// Створюй нові серця кожні 300мс
setInterval(createHeart, 300);