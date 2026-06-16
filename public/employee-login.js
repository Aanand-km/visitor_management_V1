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
        localStorage.setItem(
          'token',
          data.token
        );
        localStorage.setItem(
          'employeeId',
          data.employee.id
        );
        localStorage.setItem(
          'employeeName',
          data.employee.name
        );

        window.location.href =
          'employee-dashboard.html';

      } else {

        alert(data.message);

      }

    });