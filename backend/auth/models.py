from backend import db
from flask_bcrypt import Bcrypt 
from backend import app

class User(db.Model):
    id=db.Column(db.Integer, primary_key=True)
    first_name=db.Column(db.String(150),nullable=False)
    last_name=db.Column(db.String(150),nullable=False)
    email=db.Column(db.String(150),nullable=False,unique=True)
    password=db.Column(db.String(150),nullable=False)

    def __init__(self,email,password,first_name,last_name):
        self.first_name=first_name
        self.last_name=last_name
        self.email=email
        self.password=Bcrypt.hash(password.encode('utf-8'),Bcrypt.gensalt()).decode('utf-8') 

    #function to verify password 
    #self.password is the hashed password stored in the database
    #password is the password entered by the user

    def check_password(self,password):
        return Bcrypt.checkpw(password.encode('utf-8'),self.password.encode('utf-8'))  
    
    with app.app_context():
        db.create_all()

