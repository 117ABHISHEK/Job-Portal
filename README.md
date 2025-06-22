# 🧠 Job Portal Web Application

A fully functional job portal web app built in just **one week** as a personal challenge — from scratch — using HTML, CSS, Bootstrap, Express.js, and SQLite. Inspired by a past hackathon experience where I couldn't finish the project, this is my redemption story. ✊

---

## 🚀 Features

- ✅ User and Employer registration/login
- 🧑‍💼 Employers can:
  - Post jobs
  - View applicants
- 👨‍💻 Users can:
  - View job listings
  - Apply to jobs with resume upload
  - Track submitted applications
- 🔐 Password hashing with `bcrypt`
- 📁 Resume uploads via `multer`
- 🎨 Clean UI using Bootstrap 5 + custom CSS

---

## 🛠 Tech Stack

| Layer        | Tech Used                   |
|--------------|-----------------------------|
| Frontend     | HTML, CSS, Bootstrap        |
| Backend      | Node.js, Express.js         |
| Database     | SQLite (temporary) — will migrate to MongoDB |
| File Uploads | Multer (for resume uploads) |
| Auth         | express-session, bcrypt     |

---

## 📁 Folder Structure

```
job-portal/
├── app.js
├── package.json
├── package-lock.json
├── views/
│   ├── index.html
│   ├── register.html
│   ├── login.html
│   ├── post-job.html
│   ├── jobs.html
│   └── apply.html
├── public/
│   ├── styles.css
│   └── uploads/
│       └── [resume files]
└── db/
    └── jobportal.db
```

---

## 🧪 Setup & Run

1. **Clone the Repo**
   ```bash
   git clone https://github.com/117ABHISHEK/Job-Portal.git
   cd job-portal
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run the Server**
   ```bash
   node app.js
   ```

4. **Visit in Browser**
   ```
   http://localhost:3000
   ```

---

## 💡 Motivation

This project is born out of a past hackathon where we couldn't submit our job portal project. I always wanted to complete that vision. After a few days of planning, I built this solo within a week — a mix of what I learned and what I wished I'd done back then. Now, it's real.

---

## 📝 To-Do / Improvements

- ⏳ Migrate to MongoDB (currently using SQLite)
- ✅ Create employer dashboard UI
- ✅ Add file type validation for resumes
- ✍️ Create profile management for users
- 📬 Notifications & admin interface

---

## 📜 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2025 117ABHISHEK

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

> 🧩 *Prototype now, product later.*  
> 🛠️ Built with passion, refined with persistence.

---

## 🤝 Let's Connect

If you're reading this and working on something similar — I'd love to connect and learn from each other!

Made with ❤️ and a lot of caffeine.

