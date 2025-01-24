from . import auth
from flask import request,jsonify
from backend.auth.models import User,check_password
from backend import db



@auth.route('/register', methods=['GET','POST'])


@auth.route('/register', methods=['GET','POST'])

def register():
    if request.method=='POST':
        #handle login
        first_name=request.form['name']
        last_name=request.form['last_name']
        email=request.form['email']
        password=request.form['password']

        new_user=User(email=email,password=password,first_name=first_name,last_name=last_name)
        db.session.add(new_user)
        db.session.commit()
        return jsonify({'message':'User created successfully'})
    

@auth.route('/login', methods=['GET','POST'])


def login():
    if request.method=='POST':
        email=request.form['email']
        password=request.form['password']
        user=User.query.filter_by(email=email).first()
        if user is None:
            return 'User not registered'
        if user.check_password(password):
            return 'Logged in'
        pass
        return 'Registered'


