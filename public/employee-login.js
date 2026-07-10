document.getElementById('loginForm')
  .addEventListener(
    'submit',
    async (e) => {

      e.preventDefault();

      const email =
        document.getElementById('email').value;

      const password =
        document.getElementById('password').value;

      const response =
        await fetch('/auth/login', {

          method: 'POST',
          credentials: "include",
          headers: {
            'Content-Type':
              'application/json'
          },

          body: JSON.stringify({
            email,
            password
          })

        });

      const data =
        await response.json();

      if (response.ok) {
        console.log(data);
console.log(data.employee);
console.log(data.employee.id);
        sessionStorage.setItem(
    "employeeName",
    data.employee.name
);

        window.location.href =
"/auth/dashboard"; 

      } else {

        alert(data.message);

      }

    });