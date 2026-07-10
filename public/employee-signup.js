document
.getElementById('signupForm')
.addEventListener(
'submit',
async(e)=>{

e.preventDefault();

const employeeId =
document.getElementById(
'employeeId'
).value;

const email =
document.getElementById(
'email'
).value;

const password =
document.getElementById(
'password'
).value;

const response =
await fetch('/auth/signup',{

method:'POST',
credentials: "include",
headers:{
'Content-Type':
'application/json'
},

body:JSON.stringify({
employeeId,
email,
password
})

});

const data =
await response.json();

alert(data.message);

if(response.ok){

window.location.href =
'employee-login.html';

}

});