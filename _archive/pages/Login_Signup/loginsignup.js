let password = document.getElementById('password');
let icon = document.getElementById('icon');

icon.addEventListener('click', () => {
    if (password.type === 'password') {
        password.type = 'text';
        icon.src = 'https://res.cloudinary.com/ams1rfsh/image/upload/v1787466688/show_qka543.png';
    } else {
        password.type = 'password';
        icon.src = 'https://res.cloudinary.com/ams1rfsh/image/upload/v1787466688/hide_y2jxif.png';
    }
});


// Card Section Logic
let card = document.getElementById('card');
let loginContainer = document.querySelector('.login-container');
let signupContainer = document.querySelector('.signup-container');

const cardData = {
    new_user: {
        title: "New User?",
        paragraph: "Create an account to enjoy our services.",
        button: "Create Account"
    },
    existing_user: {
        title: "Already have an account?",
        paragraph: "Log in to enjoy our services.",
        button: "Login Now"
    }
};

card.addEventListener('click', (e) => {
    if (e.target.id === 'switchBtn') {
        card.classList.toggle('action');
        
        if (card.classList.contains('action')) {
            card.innerHTML = `
                <h2>${cardData.existing_user.title}</h2>
                <p>${cardData.existing_user.paragraph}</p>
                <button type="button" id="switchBtn">${cardData.existing_user.button}</button>
            `;
        } else {
            card.innerHTML = `
                <h2>${cardData.new_user.title}</h2>
                <p>${cardData.new_user.paragraph}</p>
                <button type="button" id="switchBtn">${cardData.new_user.button}</button>
            `;
        }
    }
});

/*----------------------PASSWORD VALIDATION----------------------*/

password.addEventListener('input', () => {
    if (password.value.length < 6) {
        password.style.borderColor = 'red';
    } else {
        password.style.borderColor = 'green';
    }
});

// Random Password Genrator
const Alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const alpha = "abcdefghijklmnopqrstuvwxyz";
const num = "0123456789";
const sym = "!@#$%^&*()_+=-[]{}|;:,.<>?";

let passwordb = document.getElementById("passwordb");
let lengt = 12;
let generatePass = Alpha + alpha + num + sym;
function createPassword(){
    let password = "";
    password += Alpha[Math.floor(Math.random() * Alpha.length)];
    password += alpha[Math.floor(Math.random() * alpha.length)];
    password += num[Math.floor(Math.random() * num.length)];
    password += sym[Math.floor(Math.random() * sym.length)];

    while (lengt >= password.length ){
        password += generatePass[Math.floor(Math.random() * generatePass.length)];
    }
    passwordb.value = password
}

window.onload = createPassword();