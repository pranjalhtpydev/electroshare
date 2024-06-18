// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBr8DFXT9jK53PSmbhqf2CbsQdyHTp9GXc",
  authDomain: "adminwork-af748.firebaseapp.com",
  databaseURL: "https://adminwork-af748-default-rtdb.firebaseio.com",
  projectId: "adminwork-af748",
  storageBucket: "adminwork-af748.appspot.com",
  messagingSenderId: "771867273912",
  appId: "1:771867273912:web:1febfdcc26648c1fff224d",
  measurementId: "G-C8QC2D0BB0"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

document.getElementById('login-btn').addEventListener('click', login);
document.getElementById('google-login-btn').addEventListener('click', googleLogin);
document.getElementById('forgot-password-btn').addEventListener('click', forgotPassword);
document.getElementById('signup-btn').addEventListener('click', signup);
document.getElementById('signout-btn').addEventListener('click', signout);
document.getElementById('share-file-btn').addEventListener('click', shareFile);
document.getElementById('retrieve-file-btn').addEventListener('click', retrieveFile);
document.getElementById('clear-history-btn').addEventListener('click', clearHistory);

auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('file-sharing-container').style.display = 'block';
        loadSharingHistory();
    } else {
        document.getElementById('auth-container').style.display = 'block';
        document.getElementById('file-sharing-container').style.display = 'none';
    }
});

function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    auth.signInWithEmailAndPassword(email, password).catch(error => alert(error.message));
}

function googleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(error => alert(error.message));
}

function forgotPassword() {
    const email = document.getElementById('email').value;
    auth.sendPasswordResetEmail(email).then(() => {
        alert('Password reset email sent');
    }).catch(error => alert(error.message));
}

function signup() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    auth.createUserWithEmailAndPassword(email, password).catch(error => alert(error.message));
}

function signout() {
    auth.signOut();
}

function shareFile() {
    const file = document.getElementById('file-input').files[0];
    const customCode = document.getElementById('custom-code').value;
    const code = customCode || Math.floor(100000 + Math.random() * 900000).toString();
    const progressBar = document.getElementById('upload-progress');

    if (file) {
        const storageRef = storage.ref().child('files/' + code + '/' + file.name);
        const uploadTask = storageRef.put(file);

        uploadTask.on('state_changed', snapshot => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            progressBar.style.display = 'block';
            progressBar.value = progress;
        }, error => {
            alert(error.message);
            progressBar.style.display = 'none';
        }, () => {
            uploadTask.snapshot.ref.getDownloadURL().then(downloadURL => {
                db.collection('files').doc(code).set({
                    filename: file.name,
                    owner: auth.currentUser.uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => {
                    document.getElementById('share-code').innerText = code;
                    alert('File shared successfully!');
                    saveSharingHistory(code, file.name);
                    progressBar.style.display = 'none';
                }).catch(error => alert(error.message));
            }).catch(error => alert(error.message));
        });
    } else {
        alert('Please select a file to share');
    }
}

function retrieveFile() {
    const code = document.getElementById('retrieve-code').value;
    db.collection('files').doc(code).get().then(doc => {
        if (doc.exists) {
            const fileData = doc.data();
            const storageRef = storage.ref().child('files/' + code + '/' + fileData.filename);
            storageRef.getDownloadURL().then(url => {
                const fileList = document.getElementById('file-list');
                fileList.innerHTML = `<a href="${url}" download>${fileData.filename}</a>`;
            }).catch(error => alert(error.message));
        } else {
            alert('Invalid code');
        }
    }).catch(error => alert(error.message));
}

function saveSharingHistory(code, filename) {
    db.collection('users').doc(auth.currentUser.uid).collection('history').add({
        code: code,
        filename: filename,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        loadSharingHistory();
    }).catch(error => alert(error.message));
}

function loadSharingHistory() {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';
    db.collection('users').doc(auth.currentUser.uid).collection('history').orderBy('createdAt', 'desc').get().then(querySnapshot => {
        querySnapshot.forEach(doc => {
            const data = doc.data();
            const listItem = document.createElement('div');
            listItem.innerText = `Code: ${data.code}, File: ${data.filename}`;
            historyList.appendChild(listItem);
        });
    }).catch(error => alert(error.message));
}

function clearHistory() {
    if (confirm("Are you sure you want to clear your history? This action cannot be undone.")) {
        const userHistoryRef = db.collection('users').doc(auth.currentUser.uid).collection('history');
        userHistoryRef.get().then(querySnapshot => {
            const batch = db.batch();
            querySnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            return batch.commit();
        }).then(() => {
            alert('History cleared successfully');
            loadSharingHistory();
        }).catch(error => alert(error.message));
    }
}
