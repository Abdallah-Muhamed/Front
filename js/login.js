function login(){
    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;

    let users = JSON.parse(localStorage.getItem("users")) || [];

    let user = users.find(u=>u.email===email && u.password===password);

    if(user){
        localStorage.setItem("currentUser",JSON.stringify(user));
        location.href="index.html";
    }else{
        alert("wrong data");
    }
}