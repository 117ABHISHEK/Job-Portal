const express = require("express")
const path = require("path")
const sqlite3 = require("sqlite3").verbose()
const bodyParser = require("body-parser")
const session = require("express-session")
const bcrypt = require("bcrypt")
const multer = require("multer")
const fs = require("fs")

const app = express()
const PORT = 3000

// Middleware
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, "public")))
app.use(
  session({
    secret: "jobPortalSecret",
    resave: false,
    saveUninitialized: true,
  }),
)

// View Engine
app.set("views", path.join(__dirname, "views"))
app.set("view engine", "html")

// Enhanced Upload Config for Resume and Profile Pictures
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath
    if (file.fieldname === "profilePicture") {
      uploadPath = path.join(__dirname, "public/uploads/profiles")
    } else {
      uploadPath = path.join(__dirname, "public/uploads/resumes")
    }

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true })
    }
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "profilePicture") {
      if (file.mimetype.startsWith("image/")) {
        cb(null, true)
      } else {
        cb(new Error("Only image files are allowed for profile pictures"))
      }
    } else if (file.fieldname === "resume") {
      if (file.mimetype === "application/pdf") {
        cb(null, true)
      } else {
        cb(new Error("Only PDF files are allowed for resumes"))
      }
    } else {
      cb(null, true)
    }
  },
})

// Initialize Database
const db = new sqlite3.Database("./db/jobportal.db", (err) => {
  if (err) console.error("DB Error:", err.message)
  else console.log("✅ Connected to SQLite DB")
})

// Create Tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('user', 'employer')),
    profile_picture TEXT,
    phone TEXT,
    location TEXT,
    bio TEXT,
    skills TEXT,
    experience TEXT,
    company_name TEXT,
    company_description TEXT,
    website TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)
  db.run(`CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT,
    posted_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(posted_by) REFERENCES users(id)
  )`)
  db.run(`CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    job_id INTEGER,
    resume_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(job_id) REFERENCES jobs(id)
  )`)
})

// Helper function to get default avatar SVG
function getDefaultAvatar(size = 32) {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 24 24' fill='%23666'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E`
}

// Helper function to generate enhanced HTML template with professional navbar
function generateEnhancedHTML(title, content, user = null) {
  return `
    <!DOCTYPE html>
    <html lang="en" data-theme="light">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - JobPortal</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
      <link rel="stylesheet" href="/styles.css">
    </head>
    <body>
      <!-- Professional Navbar -->
      <nav class="navbar navbar-expand-lg navbar-custom fixed-top">
        <div class="container">
          <!-- Brand Logo -->
          <a class="navbar-brand d-flex align-items-center" href="/">
            <div class="brand-logo me-2">
              <i class="fas fa-briefcase"></i>
            </div>
            <span class="brand-text">JobPortal</span>
          </a>
          
          <!-- Mobile Toggle Button -->
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarContent">
            <span class="navbar-toggler-icon"></span>
          </button>
          
          <!-- Navbar Content -->
          <div class="collapse navbar-collapse" id="navbarContent">
            <!-- Main Navigation -->
            <ul class="navbar-nav me-auto">
              <li class="nav-item">
                <a class="nav-link ${title === "Home" ? "active" : ""}" href="/">
                  <i class="fas fa-home me-1"></i>Home
                </a>
              </li>
              
              ${
                user
                  ? `
                <li class="nav-item">
                  <a class="nav-link ${title === "Dashboard" ? "active" : ""}" href="/dashboard">
                    <i class="fas fa-tachometer-alt me-1"></i>Dashboard
                  </a>
                </li>
                
                ${
                  user.type === "user"
                    ? `
                  <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                      <i class="fas fa-search me-1"></i>Jobs
                    </a>
                    <ul class="dropdown-menu">
                      <li><a class="dropdown-item" href="/jobs">
                        <i class="fas fa-list me-2"></i>Browse All Jobs
                      </a></li>
                      <li><a class="dropdown-item" href="/my-applications">
                        <i class="fas fa-file-alt me-2"></i>My Applications
                      </a></li>
                      <li><hr class="dropdown-divider"></li>
                      <li><a class="dropdown-item" href="/jobs?category=remote">
                        <i class="fas fa-home me-2"></i>Remote Jobs
                      </a></li>
                    </ul>
                  </li>
                `
                    : `
                  <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                      <i class="fas fa-building me-1"></i>Employer
                    </a>
                    <ul class="dropdown-menu">
                      <li><a class="dropdown-item" href="/post-job">
                        <i class="fas fa-plus me-2"></i>Post New Job
                      </a></li>
                      <li><a class="dropdown-item" href="/employer/applicants">
                        <i class="fas fa-users me-2"></i>View Applicants
                      </a></li>
                      <li><hr class="dropdown-divider"></li>
                      <li><a class="dropdown-item" href="/employer/jobs">
                        <i class="fas fa-briefcase me-2"></i>My Job Posts
                      </a></li>
                    </ul>
                  </li>
                `
                }
              `
                  : `
                <li class="nav-item">
                  <a class="nav-link" href="/jobs">
                    <i class="fas fa-search me-1"></i>Browse Jobs
                  </a>
                </li>
              `
              }
              
              <li class="nav-item">
                <a class="nav-link ${title === "About Us" ? "active" : ""}" href="/about">
                  <i class="fas fa-info-circle me-1"></i>About
                </a>
              </li>
              
              <li class="nav-item">
                <a class="nav-link ${title === "Contact Us" ? "active" : ""}" href="/contact">
                  <i class="fas fa-envelope me-1"></i>Contact
                </a>
              </li>
            </ul>
            
            <!-- Right Side Navigation -->
            <ul class="navbar-nav align-items-center">
              <!-- Theme Toggle -->
              <li class="nav-item me-2">
                <button class="btn btn-theme-toggle" onclick="toggleTheme()" id="themeToggle">
                  <span class="theme-icon">🌙</span>
                </button>
              </li>
              
              ${
                user
                  ? `
                <!-- User Profile Dropdown -->
                <li class="nav-item dropdown">
                  <a class="nav-link dropdown-toggle user-dropdown" href="#" role="button" data-bs-toggle="dropdown">
                    <img src="${user.profile_picture || getDefaultAvatar(32)}" 
                         alt="Profile" class="user-avatar me-2">
                    <span class="user-name d-none d-lg-inline">${user.name}</span>
                  </a>
                  <ul class="dropdown-menu dropdown-menu-end user-menu">
                    <li class="dropdown-header">
                      <div class="user-info">
                        <img src="${user.profile_picture || getDefaultAvatar(40)}" 
                             alt="Profile" class="user-avatar-large">
                        <div class="user-details">
                          <div class="user-name-large">${user.name}</div>
                          <div class="user-role">${user.type === "employer" ? "Employer" : "Job Seeker"}</div>
                        </div>
                      </div>
                    </li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="/profile">
                      <i class="fas fa-user me-2"></i>My Profile
                    </a></li>
                    <li><a class="dropdown-item" href="/settings">
                      <i class="fas fa-cog me-2"></i>Settings
                    </a></li>
                    ${
                      user.type === "employer"
                        ? `
                      <li><a class="dropdown-item" href="/employer/billing">
                        <i class="fas fa-credit-card me-2"></i>Billing
                      </a></li>
                    `
                        : `
                      <li><a class="dropdown-item" href="/saved-jobs">
                        <i class="fas fa-bookmark me-2"></i>Saved Jobs
                      </a></li>
                    `
                    }
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item text-danger" href="/logout">
                      <i class="fas fa-sign-out-alt me-2"></i>Sign Out
                    </a></li>
                  </ul>
                </li>
              `
                  : `
                <!-- Guest Navigation -->
                <li class="nav-item me-2">
                  <a class="btn btn-outline-primary btn-nav" href="/login">
                    <i class="fas fa-sign-in-alt me-1"></i>Sign In
                  </a>
                </li>
                <li class="nav-item">
                  <a class="btn btn-primary btn-nav" href="/register">
                    <i class="fas fa-user-plus me-1"></i>Get Started
                  </a>
                </li>
              `
              }
            </ul>
          </div>
        </div>
      </nav>

      <!-- Floating Background Elements -->
      <div class="floating-shapes">
        <div class="floating-shape"></div>
        <div class="floating-shape"></div>
        <div class="floating-shape"></div>
      </div>

      <!-- Main Content with proper spacing for fixed navbar -->
      <main class="main-content">
        <div class="container">
          <div class="main-container">
            ${content}
          </div>
        </div>
      </main>

      <!-- Footer -->
      <footer class="footer-custom">
        <div class="container">
          <div class="row">
            <div class="col-md-4">
              <div class="footer-brand">
                <div class="brand-logo me-2">
                  <i class="fas fa-briefcase"></i>
                </div>
                <span class="brand-text">JobPortal</span>
              </div>
              <p class="footer-description">
                Connecting talented professionals with amazing opportunities worldwide.
              </p>
              <div class="social-links">
                <a href="#" class="social-link"><i class="fab fa-facebook"></i></a>
                <a href="#" class="social-link"><i class="fab fa-twitter"></i></a>
                <a href="#" class="social-link"><i class="fab fa-linkedin"></i></a>
                <a href="#" class="social-link"><i class="fab fa-instagram"></i></a>
              </div>
            </div>
            <div class="col-md-2">
              <h6 class="footer-title">For Job Seekers</h6>
              <ul class="footer-links">
                <li><a href="/jobs">Browse Jobs</a></li>
                <li><a href="/companies">Companies</a></li>
                <li><a href="/career-advice">Career Advice</a></li>
                <li><a href="/resume-builder">Resume Builder</a></li>
              </ul>
            </div>
            <div class="col-md-2">
              <h6 class="footer-title">For Employers</h6>
              <ul class="footer-links">
                <li><a href="/post-job">Post a Job</a></li>
                <li><a href="/pricing">Pricing</a></li>
                <li><a href="/talent-search">Talent Search</a></li>
                <li><a href="/employer-resources">Resources</a></li>
              </ul>
            </div>
            <div class="col-md-2">
              <h6 class="footer-title">Company</h6>
              <ul class="footer-links">
                <li><a href="/about">About Us</a></li>
                <li><a href="/contact">Contact</a></li>
                <li><a href="/careers">Careers</a></li>
                <li><a href="/press">Press</a></li>
              </ul>
            </div>
            <div class="col-md-2">
              <h6 class="footer-title">Support</h6>
              <ul class="footer-links">
                <li><a href="/help">Help Center</a></li>
                <li><a href="/privacy">Privacy Policy</a></li>
                <li><a href="/terms">Terms of Service</a></li>
                <li><a href="/security">Security</a></li>
              </ul>
            </div>
          </div>
          <hr class="footer-divider">
          <div class="row align-items-center">
            <div class="col-md-6">
              <p class="footer-copyright">
                © 2024 JobPortal. All rights reserved.
              </p>
            </div>
            <div class="col-md-6 text-md-end">
              <div class="footer-meta">
                <span class="me-3">Made with ❤️ for job seekers</span>
                <span class="version">v2.0</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
      <script>
        // Theme Management
        function toggleTheme() {
          const html = document.documentElement;
          const themeIcon = document.querySelector('.theme-icon');
          
          const currentTheme = html.getAttribute('data-theme');
          const newTheme = currentTheme === 'light' ? 'dark' : 'light';
          
          html.setAttribute('data-theme', newTheme);
          localStorage.setItem('theme', newTheme);
          
          if (newTheme === 'dark') {
            themeIcon.textContent = '☀️';
          } else {
            themeIcon.textContent = '🌙';
          }
        }

        // Load saved theme
        document.addEventListener('DOMContentLoaded', function() {
          const savedTheme = localStorage.getItem('theme') || 'light';
          const html = document.documentElement;
          const themeIcon = document.querySelector('.theme-icon');
          
          html.setAttribute('data-theme', savedTheme);
          
          if (savedTheme === 'dark') {
            themeIcon.textContent = '☀️';
          }

          // Add entrance animation
          const mainContainer = document.querySelector('.main-container');
          if (mainContainer) {
            mainContainer.style.opacity = '0';
            mainContainer.style.transform = 'translateY(20px)';
            setTimeout(() => {
              mainContainer.style.opacity = '1';
              mainContainer.style.transform = 'translateY(0)';
            }, 100);
          }

          // Navbar scroll effect
          window.addEventListener('scroll', function() {
            const navbar = document.querySelector('.navbar-custom');
            if (window.scrollY > 50) {
              navbar.classList.add('navbar-scrolled');
            } else {
              navbar.classList.remove('navbar-scrolled');
            }
          });

          // Close mobile menu when clicking outside
          document.addEventListener('click', function(e) {
            const navbar = document.querySelector('.navbar-collapse');
            const toggler = document.querySelector('.navbar-toggler');
            
            if (!navbar.contains(e.target) && !toggler.contains(e.target)) {
              const bsCollapse = new bootstrap.Collapse(navbar, {toggle: false});
              bsCollapse.hide();
            }
          });
        });
      </script>
    </body>
    </html>
  `
}

// Routes

app.get("/", (req, res) => {
  // Check if user is logged in and redirect to a logged-in version
  if (req.session.user) {
    const user = req.session.user
    const content = `
      <div class="hero-section-logged-in">
        <div class="container">
          <div class="text-center">
            <img src="${user.profile_picture || getDefaultAvatar(100)}" 
                 alt="Profile" class="rounded-circle mb-3" width="100" height="100"
                 style="object-fit: cover; border: 4px solid var(--primary-color);">
            <h1 class="hero-title">Welcome back, ${user.name}!</h1>
            <p class="hero-subtitle">
              Ready to ${user.type === "employer" ? "find great talent" : "find your next opportunity"}?
            </p>
            <div class="d-flex justify-content-center gap-4 flex-wrap">
              ${
                user.type === "employer"
                  ? `
                <a href="/post-job" class="btn btn-primary btn-lg btn-custom hover-lift">
                  <i class="fas fa-plus me-2"></i>Post a Job
                </a>
                <a href="/employer/applicants" class="btn btn-outline-primary btn-lg btn-custom hover-lift">
                  <i class="fas fa-users me-2"></i>View Applicants
                </a>
              `
                  : `
                <a href="/jobs" class="btn btn-primary btn-lg btn-custom hover-lift">
                  <i class="fas fa-search me-2"></i>Browse Jobs
                </a>
                <a href="/my-applications" class="btn btn-outline-primary btn-lg btn-custom hover-lift">
                  <i class="fas fa-file-alt me-2"></i>My Applications
                </a>
              `
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Stats Section -->
      <div class="container my-5">
        <div class="row g-4">
          <div class="col-md-4">
            <div class="card-custom text-center hover-lift">
              <div class="card-body-custom">
                <i class="fas fa-briefcase fa-2x text-primary mb-3"></i>
                <h5 class="fw-bold">1,000+</h5>
                <p class="text-muted">Active Jobs</p>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card-custom text-center hover-lift">
              <div class="card-body-custom">
                <i class="fas fa-users fa-2x text-success mb-3"></i>
                <h5 class="fw-bold">5,000+</h5>
                <p class="text-muted">Job Seekers</p>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card-custom text-center hover-lift">
              <div class="card-body-custom">
                <i class="fas fa-building fa-2x text-warning mb-3"></i>
                <h5 class="fw-bold">500+</h5>
                <p class="text-muted">Companies</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
    return res.send(generateEnhancedHTML("Home", content, user))
  }

  res.sendFile(path.join(__dirname, "views/index.html"))
})

app.get("/about", (req, res) => {
  const content = `
    <div class="text-center mb-5">
      <i class="fas fa-info-circle fa-3x text-primary mb-3"></i>
      <h1 class="fw-bold mb-3">About JobPortal</h1>
      <p class="lead text-muted">Connecting talent with opportunity since 2024</p>
    </div>

    <div class="row g-5">
      <div class="col-lg-6">
        <div class="card-custom h-100">
          <div class="card-body-custom">
            <h3 class="fw-bold mb-4">Our Mission</h3>
            <p class="text-muted mb-4">
              At JobPortal, we believe that everyone deserves to find meaningful work that aligns with their skills, 
              passions, and career goals. Our mission is to bridge the gap between talented professionals and 
              innovative companies looking for the right fit.
            </p>
            <p class="text-muted">
              We're committed to creating a platform that not only connects job seekers with employers but also 
              provides the tools and resources needed to build successful, long-lasting professional relationships.
            </p>
          </div>
        </div>
      </div>
      
      <div class="col-lg-6">
        <div class="card-custom h-100">
          <div class="card-body-custom">
            <h3 class="fw-bold mb-4">Our Story</h3>
            <p class="text-muted mb-4">
              Founded in 2024, JobPortal started as a simple idea: make job searching and hiring more efficient, 
              transparent, and human-centered. Our founders, experienced professionals from the tech and HR industries, 
              recognized the need for a platform that prioritizes quality connections over quantity.
            </p>
            <p class="text-muted">
              Today, we're proud to serve thousands of job seekers and hundreds of companies worldwide, 
              facilitating meaningful career moves and helping businesses find the talent they need to grow.
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-4 mt-5">
      <div class="col-md-4">
        <div class="text-center">
          <div class="mb-3">
            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
              <i class="fas fa-eye fa-2x text-white"></i>
            </div>
          </div>
          <h5 class="fw-bold mb-3">Our Vision</h5>
          <p class="text-muted">
            To become the world's most trusted platform for career advancement and talent acquisition.
          </p>
        </div>
      </div>
      
      <div class="col-md-4">
        <div class="text-center">
          <div class="mb-3">
            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #10b981, #06b6d4); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
              <i class="fas fa-heart fa-2x text-white"></i>
            </div>
          </div>
          <h5 class="fw-bold mb-3">Our Values</h5>
          <p class="text-muted">
            Transparency, integrity, innovation, and putting people first in everything we do.
          </p>
        </div>
      </div>
      
      <div class="col-md-4">
        <div class="text-center">
          <div class="mb-3">
            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #f59e0b, #ef4444); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
              <i class="fas fa-rocket fa-2x text-white"></i>
            </div>
          </div>
          <h5 class="fw-bold mb-3">Our Impact</h5>
          <p class="text-muted">
            Over 10,000 successful job placements and counting, with 95% satisfaction rate.
          </p>
        </div>
      </div>
    </div>

    <div class="card-custom mt-5">
      <div class="card-body-custom text-center">
        <h3 class="fw-bold mb-4">Join Our Community</h3>
        <p class="text-muted mb-4">
          Whether you're looking for your next career opportunity or searching for talented professionals 
          to join your team, JobPortal is here to help you succeed.
        </p>
        <div class="d-flex justify-content-center gap-3">
          ${
            req.session.user
              ? `
            <a href="/dashboard" class="btn btn-primary-custom btn-custom">
              <i class="fas fa-tachometer-alt me-2"></i>Go to Dashboard
            </a>
          `
              : `
            <a href="/register" class="btn btn-primary-custom btn-custom">
              <i class="fas fa-user-plus me-2"></i>Get Started Today
            </a>
            <a href="/contact" class="btn btn-secondary-custom btn-custom">
              <i class="fas fa-envelope me-2"></i>Contact Us
            </a>
          `
          }
        </div>
      </div>
    </div>
  `

  res.send(generateEnhancedHTML("About Us", content, req.session.user))
})

app.get("/contact", (req, res) => {
  const content = `
    <div class="text-center mb-5">
      <i class="fas fa-envelope fa-3x text-primary mb-3"></i>
      <h1 class="fw-bold mb-3">Contact Us</h1>
      <p class="lead text-muted">We'd love to hear from you. Get in touch with our team.</p>
    </div>

    <div class="row g-5">
      <div class="col-lg-8">
        <div class="card-custom">
          <div class="card-header-custom">
            <h4 class="mb-0">
              <i class="fas fa-paper-plane me-2"></i>Send us a Message
            </h4>
          </div>
          <div class="card-body-custom">
            <form id="contactForm">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label-custom">
                    <i class="fas fa-user me-2"></i>Full Name
                  </label>
                  <input type="text" class="form-control form-control-custom" required 
                         placeholder="Your full name" ${req.session.user ? `value="${req.session.user.name}"` : ""}>
                </div>
                
                <div class="col-md-6">
                  <label class="form-label-custom">
                    <i class="fas fa-envelope me-2"></i>Email Address
                  </label>
                  <input type="email" class="form-control form-control-custom" required 
                         placeholder="Your email address" ${req.session.user ? `value="${req.session.user.email}"` : ""}>
                </div>
                
                <div class="col-12">
                  <label class="form-label-custom">
                    <i class="fas fa-tag me-2"></i>Subject
                  </label>
                  <select class="form-select form-select-custom" required>
                    <option value="">Select a subject</option>
                    <option value="general">General Inquiry</option>
                    <option value="support">Technical Support</option>
                    <option value="billing">Billing Question</option>
                    <option value="partnership">Partnership Opportunity</option>
                    <option value="feedback">Feedback</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div class="col-12">
                  <label class="form-label-custom">
                    <i class="fas fa-comment me-2"></i>Message
                  </label>
                  <textarea class="form-control form-control-custom" rows="5" required 
                            placeholder="Tell us how we can help you..."></textarea>
                </div>
                
                <div class="col-12">
                  <button type="submit" class="btn btn-primary-custom btn-custom">
                    <i class="fas fa-paper-plane me-2"></i>Send Message
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      <div class="col-lg-4">
        <div class="card-custom mb-4">
          <div class="card-body-custom">
            <h5 class="fw-bold mb-3">
              <i class="fas fa-map-marker-alt me-2 text-primary"></i>Our Office
            </h5>
            <p class="text-muted mb-0">
              123 Business Street<br>
              Tech District, TD 12345<br>
              United States
            </p>
          </div>
        </div>
        
        <div class="card-custom mb-4">
          <div class="card-body-custom">
            <h5 class="fw-bold mb-3">
              <i class="fas fa-phone me-2 text-success"></i>Phone
            </h5>
            <p class="text-muted mb-0">
              <a href="tel:+1234567890" class="text-decoration-none">+1 (234) 567-8900</a><br>
              <small>Monday - Friday, 9 AM - 6 PM EST</small>
            </p>
          </div>
        </div>
        
        <div class="card-custom mb-4">
          <div class="card-body-custom">
            <h5 class="fw-bold mb-3">
              <i class="fas fa-envelope me-2 text-warning"></i>Email
            </h5>
            <p class="text-muted mb-0">
              <a href="mailto:support@jobportal.com" class="text-decoration-none">support@jobportal.com</a><br>
              <small>We'll respond within 24 hours</small>
            </p>
          </div>
        </div>
        
        <div class="card-custom">
          <div class="card-body-custom">
            <h5 class="fw-bold mb-3">
              <i class="fas fa-clock me-2 text-info"></i>Business Hours
            </h5>
            <div class="text-muted">
              <div class="d-flex justify-content-between">
                <span>Monday - Friday:</span>
                <span>9:00 AM - 6:00 PM</span>
              </div>
              <div class="d-flex justify-content-between">
                <span>Saturday:</span>
                <span>10:00 AM - 4:00 PM</span>
              </div>
              <div class="d-flex justify-content-between">
                <span>Sunday:</span>
                <span>Closed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card-custom mt-5">
      <div class="card-body-custom text-center">
        <h4 class="fw-bold mb-3">Frequently Asked Questions</h4>
        <p class="text-muted mb-4">
          Before reaching out, you might find your answer in our FAQ section.
        </p>
        <a href="/faq" class="btn btn-secondary-custom btn-custom">
          <i class="fas fa-question-circle me-2"></i>View FAQ
        </a>
      </div>
    </div>

    <script>
      document.getElementById('contactForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Show success message
        const formContainer = e.target.parentElement;
        formContainer.innerHTML = \`
          <div class="text-center py-5">
            <i class="fas fa-check-circle fa-3x text-success mb-3"></i>
            <h4 class="fw-bold text-success mb-3">Message Sent Successfully!</h4>
            <p class="text-muted mb-4">
              Thank you for contacting us. We'll get back to you within 24 hours.
            </p>
            <button onclick="location.reload()" class="btn btn-primary-custom btn-custom">
              <i class="fas fa-redo me-2"></i>Send Another Message
            </button>
          </div>
        \`;
      });
    </script>
  `

  res.send(generateEnhancedHTML("Contact Us", content, req.session.user))
})

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "views/register.html"))
})

app.post("/register", (req, res) => {
  const { name, email, password, type } = req.body
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      const content = `
        <div class="text-center">
          <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
          <h2 class="fw-bold text-danger mb-3">Registration Failed</h2>
          <div class="alert alert-danger-custom">
            <i class="fas fa-times-circle me-2"></i>
            <strong>Error:</strong> Failed to process your password. Please try again.
          </div>
          <div class="d-flex justify-content-center gap-3">
            <a href="/register" class="btn btn-primary-custom btn-custom">
              <i class="fas fa-redo me-2"></i>Try Again
            </a>
            <a href="/" class="btn btn-secondary-custom btn-custom">
              <i class="fas fa-home me-2"></i>Go Home
            </a>
          </div>
        </div>
      `
      return res.send(generateEnhancedHTML("Registration Error", content))
    }

    const query = `INSERT INTO users (name, email, password, type) VALUES (?, ?, ?, ?)`
    db.run(query, [name, email, hash, type], (err) => {
      if (err) {
        const content = `
          <div class="text-center">
            <i class="fas fa-user-times fa-3x text-warning mb-3"></i>
            <h2 class="fw-bold text-warning mb-3">Registration Failed</h2>
            <div class="alert alert-danger-custom">
              <i class="fas fa-exclamation-triangle me-2"></i>
              <strong>Account Creation Failed!</strong><br>
              This email address is already registered. Please try with a different email or sign in to your existing account.
            </div>
            <div class="d-flex justify-content-center gap-3 flex-wrap">
              <a href="/register" class="btn btn-primary-custom btn-custom">
                <i class="fas fa-user-plus me-2"></i>Try Different Email
              </a>
              <a href="/login" class="btn btn-success-custom btn-custom">
                <i class="fas fa-sign-in-alt me-2"></i>Sign In Instead
              </a>
            </div>
          </div>
        `
        return res.send(generateEnhancedHTML("Registration Failed", content))
      }

      const content = `
        <div class="text-center">
          <i class="fas fa-check-circle fa-3x text-success mb-3"></i>
          <h2 class="fw-bold text-success mb-3">Registration Successful!</h2>
          <div class="alert alert-success-custom">
            <i class="fas fa-party-horn me-2"></i>
            <strong>Welcome to JobPortal!</strong><br>
            Your account has been created successfully. You can now sign in and start exploring opportunities.
          </div>
          <div class="d-flex justify-content-center gap-3">
            <a href="/login" class="btn btn-success-custom btn-custom">
              <i class="fas fa-sign-in-alt me-2"></i>Sign In Now
            </a>
          </div>
        </div>
      `
      res.send(generateEnhancedHTML("Registration Successful", content))
    })
  })
})

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views/login.html"))
})

app.post("/login", (req, res) => {
  const { email, password } = req.body
  const query = `SELECT * FROM users WHERE email = ?`
  db.get(query, [email], (err, user) => {
    if (err || !user) {
      const content = `
        <div class="text-center">
          <i class="fas fa-user-slash fa-3x text-danger mb-3"></i>
          <h2 class="fw-bold text-danger mb-3">Login Failed</h2>
          <div class="alert alert-danger-custom">
            <i class="fas fa-exclamation-triangle me-2"></i>
            <strong>Invalid Credentials!</strong><br>
            The email or password you entered is incorrect. Please check your credentials and try again.
          </div>
          <div class="d-flex justify-content-center gap-3 flex-wrap">
            <a href="/login" class="btn btn-primary-custom btn-custom">
              <i class="fas fa-redo me-2"></i>Try Again
            </a>
            <a href="/register" class="btn btn-success-custom btn-custom">
              <i class="fas fa-user-plus me-2"></i>Create Account
            </a>
          </div>
        </div>
      `
      return res.send(generateEnhancedHTML("Login Failed", content))
    }

    bcrypt.compare(password, user.password, (err, result) => {
      if (result) {
        req.session.user = user
        res.redirect("/dashboard")
      } else {
        const content = `
          <div class="text-center">
            <i class="fas fa-lock fa-3x text-warning mb-3"></i>
            <h2 class="fw-bold text-warning mb-3">Access Denied</h2>
            <div class="alert alert-danger-custom">
              <i class="fas fa-key me-2"></i>
              <strong>Incorrect Password!</strong><br>
              The password you entered is incorrect. Please check your password and try again.
            </div>
            <div class="d-flex justify-content-center gap-3">
              <a href="/login" class="btn btn-primary-custom btn-custom">
                <i class="fas fa-redo me-2"></i>Try Again
              </a>
            </div>
          </div>
        `
        res.send(generateEnhancedHTML("Login Failed", content))
      }
    })
  })
})

app.get("/logout", (req, res) => {
  req.session.destroy()
  const content = `
    <div class="text-center">
      <i class="fas fa-sign-out-alt fa-3x text-info mb-3"></i>
      <h2 class="fw-bold mb-3">Successfully Logged Out</h2>
      <div class="alert alert-info-custom">
        <i class="fas fa-check-circle me-2"></i>
        <strong>See you soon!</strong><br>
        You have been successfully logged out of your JobPortal account.
      </div>
      <div class="d-flex justify-content-center gap-3">
        <a href="/login" class="btn btn-primary-custom btn-custom">
          <i class="fas fa-sign-in-alt me-2"></i>Sign In Again
        </a>
        <a href="/" class="btn btn-secondary-custom btn-custom">
          <i class="fas fa-home me-2"></i>Go Home
        </a>
      </div>
    </div>
  `
  res.send(generateEnhancedHTML("Logged Out", content))
})

// Profile Routes
app.get("/profile", (req, res) => {
  if (!req.session.user) return res.redirect("/login")

  const userId = req.session.user.id
  const query = `SELECT * FROM users WHERE id = ?`

  db.get(query, [userId], (err, user) => {
    if (err || !user) {
      return res.redirect("/dashboard")
    }

    // Update session with latest user data
    req.session.user = user

    // Check if we're showing success message
    const showSuccess = req.query.updated === "true"

    const successAlert = showSuccess
      ? `
      <div class="alert alert-success-custom alert-dismissible fade show" role="alert">
        <i class="fas fa-check-circle me-2"></i>
        <strong>Profile Updated!</strong> Your profile information has been successfully updated.
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    `
      : ""

    const content = `
      ${successAlert}
      <div class="row">
        <div class="col-md-4">
          <div class="card-custom text-center">
            <div class="card-body-custom">
              <div class="mb-4">
                <img src="${user.profile_picture || getDefaultAvatar(150)}" 
                     alt="Profile Picture" class="rounded-circle mb-3" width="150" height="150"
                     style="object-fit: cover; border: 4px solid var(--primary-color);">
                <h4 class="fw-bold">${user.name}</h4>
                <p class="text-muted">
                  <i class="fas fa-${user.type === "employer" ? "building" : "user"} me-2"></i>
                  ${user.type === "employer" ? "Employer" : "Job Seeker"}
                </p>
                ${
                  user.location
                    ? `
                  <p class="text-muted">
                    <i class="fas fa-map-marker-alt me-2"></i>${user.location}
                  </p>
                `
                    : ""
                }
              </div>
              <a href="/profile/edit" class="btn btn-primary-custom btn-custom">
                <i class="fas fa-edit me-2"></i>Edit Profile
              </a>
            </div>
          </div>
        </div>
        
        <div class="col-md-8">
          <div class="card-custom">
            <div class="card-header-custom">
              <h5 class="mb-0">
                <i class="fas fa-info-circle me-2"></i>Profile Information
              </h5>
            </div>
            <div class="card-body-custom">
              <div class="row g-3">
                <div class="col-md-6">
                  <strong>Email:</strong>
                  <p class="text-muted">${user.email}</p>
                </div>
                <div class="col-md-6">
                  <strong>Phone:</strong>
                  <p class="text-muted">${user.phone || "Not provided"}</p>
                </div>
                <div class="col-12">
                  <strong>Bio:</strong>
                  <p class="text-muted">${user.bio || "No bio provided yet."}</p>
                </div>
                
                ${
                  user.type === "user"
                    ? `
                  <div class="col-12">
                    <strong>Skills:</strong>
                    <p class="text-muted">${user.skills || "No skills listed yet."}</p>
                  </div>
                  <div class="col-12">
                    <strong>Experience:</strong>
                    <p class="text-muted">${user.experience || "No experience details provided."}</p>
                  </div>
                `
                    : `
                  <div class="col-md-6">
                    <strong>Company:</strong>
                    <p class="text-muted">${user.company_name || "Not provided"}</p>
                  </div>
                  <div class="col-md-6">
                    <strong>Website:</strong>
                    <p class="text-muted">${user.website ? `<a href="${user.website}" target="_blank">${user.website}</a>` : "Not provided"}</p>
                  </div>
                  <div class="col-12">
                    <strong>Company Description:</strong>
                    <p class="text-muted">${user.company_description || "No company description provided."}</p>
                  </div>
                `
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    `

    res.send(generateEnhancedHTML("My Profile", content, user))
  })
})

app.get("/profile/edit", (req, res) => {
  if (!req.session.user) return res.redirect("/login")

  const user = req.session.user

  const content = `
    <div class="text-center mb-4">
      <i class="fas fa-user-edit fa-3x text-primary mb-3"></i>
      <h2 class="fw-bold">Edit Profile</h2>
      <p class="text-muted">Update your profile information</p>
    </div>

    <form action="/profile/edit" method="POST" enctype="multipart/form-data" id="profileForm">
      <div class="row g-4">
        <div class="col-md-4">
          <div class="card-custom text-center">
            <div class="card-body-custom">
              <div class="mb-3">
                <img src="${user.profile_picture || getDefaultAvatar(150)}" 
                     alt="Profile Picture" class="rounded-circle mb-3" width="150" height="150"
                     style="object-fit: cover; border: 4px solid var(--primary-color);" id="profilePreview">
              </div>
              <div class="file-upload-wrapper">
                <input type="file" name="profilePicture" accept="image/*" class="file-upload-input" id="profilePictureInput">
                <label for="profilePictureInput" class="btn btn-primary-custom btn-custom btn-sm">
                  <i class="fas fa-camera me-2"></i>Change Photo
                </label>
              </div>
              <small class="text-muted d-block mt-2">JPG, PNG or GIF (Max 5MB)</small>
            </div>
          </div>
        </div>
        
        <div class="col-md-8">
          <div class="card-custom">
            <div class="card-body-custom">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label-custom">
                    <i class="fas fa-user me-2"></i>Full Name
                  </label>
                  <input type="text" name="name" class="form-control form-control-custom" 
                         value="${user.name}" required>
                </div>
                
                <div class="col-md-6">
                  <label class="form-label-custom">
                    <i class="fas fa-phone me-2"></i>Phone Number
                  </label>
                  <input type="tel" name="phone" class="form-control form-control-custom" 
                         value="${user.phone || ""}" placeholder="Your phone number">
                </div>
                
                <div class="col-12">
                  <label class="form-label-custom">
                    <i class="fas fa-map-marker-alt me-2"></i>Location
                  </label>
                  <input type="text" name="location" class="form-control form-control-custom" 
                         value="${user.location || ""}" placeholder="City, Country">
                </div>
                
                <div class="col-12">
                  <label class="form-label-custom">
                    <i class="fas fa-info-circle me-2"></i>Bio
                  </label>
                  <textarea name="bio" class="form-control form-control-custom" rows="3" 
                            placeholder="Tell us about yourself...">${user.bio || ""}</textarea>
                </div>
                
                ${
                  user.type === "user"
                    ? `
                  <div class="col-12">
                    <label class="form-label-custom">
                      <i class="fas fa-tools me-2"></i>Skills
                    </label>
                    <textarea name="skills" class="form-control form-control-custom" rows="2" 
                              placeholder="List your skills (e.g., JavaScript, Python, Project Management)">${user.skills || ""}</textarea>
                  </div>
                  
                  <div class="col-12">
                    <label class="form-label-custom">
                      <i class="fas fa-briefcase me-2"></i>Experience
                    </label>
                    <textarea name="experience" class="form-control form-control-custom" rows="3" 
                              placeholder="Describe your work experience...">${user.experience || ""}</textarea>
                  </div>
                `
                    : `
                  <div class="col-md-6">
                    <label class="form-label-custom">
                      <i class="fas fa-building me-2"></i>Company Name
                    </label>
                    <input type="text" name="company_name" class="form-control form-control-custom" 
                           value="${user.company_name || ""}" placeholder="Your company name">
                  </div>
                  
                  <div class="col-md-6">
                    <label class="form-label-custom">
                      <i class="fas fa-globe me-2"></i>Website
                    </label>
                    <input type="url" name="website" class="form-control form-control-custom" 
                           value="${user.website || ""}" placeholder="https://yourcompany.com">
                  </div>
                  
                  <div class="col-12">
                    <label class="form-label-custom">
                      <i class="fas fa-info-circle me-2"></i>Company Description
                    </label>
                    <textarea name="company_description" class="form-control form-control-custom" rows="3" 
                              placeholder="Describe your company...">${user.company_description || ""}</textarea>
                  </div>
                `
                }
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="text-center mt-4">
        <button type="submit" class="btn btn-success-custom btn-custom">
          <i class="fas fa-save me-2"></i>Save Changes
        </button>
        <a href="/profile" class="btn btn-secondary-custom btn-custom ms-2">
          <i class="fas fa-times me-2"></i>Cancel
        </a>
      </div>
    </form>

    <script>
      // Profile picture preview
      document.getElementById('profilePictureInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = function(e) {
            document.getElementById('profilePreview').src = e.target.result;
          };
          reader.readAsDataURL(file);
        }
      });
    </script>
  `

  res.send(generateEnhancedHTML("Edit Profile", content, user))
})

app.post("/profile/edit", upload.single("profilePicture"), (req, res) => {
  if (!req.session.user) return res.redirect("/login")

  const userId = req.session.user.id
  const { name, phone, location, bio, skills, experience, company_name, website, company_description } = req.body

  let profilePicturePath = req.session.user.profile_picture
  if (req.file) {
    profilePicturePath = `/uploads/profiles/${req.file.filename}`
  }

  const query = `UPDATE users SET 
    name = ?, phone = ?, location = ?, bio = ?, skills = ?, experience = ?, 
    company_name = ?, website = ?, company_description = ?, profile_picture = ?
    WHERE id = ?`

  db.run(
    query,
    [
      name,
      phone,
      location,
      bio,
      skills,
      experience,
      company_name,
      website,
      company_description,
      profilePicturePath,
      userId,
    ],
    (err) => {
      if (err) {
        const content = `
        <div class="text-center">
          <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
          <h2 class="fw-bold text-danger mb-3">Update Failed</h2>
          <div class="alert alert-danger-custom">
            <i class="fas fa-times-circle me-2"></i>
            <strong>Error!</strong> Failed to update your profile. Please try again.
          </div>
          <a href="/profile/edit" class="btn btn-primary-custom btn-custom">
            <i class="fas fa-redo me-2"></i>Try Again
          </a>
        </div>
      `
        return res.send(generateEnhancedHTML("Update Failed", content, req.session.user))
      }

      // Update session with new data
      const updatedUser = {
        ...req.session.user,
        name,
        phone,
        location,
        bio,
        skills,
        experience,
        company_name,
        website,
        company_description,
        profile_picture: profilePicturePath,
      }
      req.session.user = updatedUser

      // Redirect to profile page with success message
      res.redirect("/profile?updated=true")
    },
  )
})

app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/login")

  const user = req.session.user

  const content = `
    <div class="dashboard-container">
      <div class="text-center mb-5">
        <div class="mb-4">
          <img src="${user.profile_picture || getDefaultAvatar(100)}" 
               alt="Profile" class="rounded-circle mb-3" width="100" height="100"
               style="object-fit: cover; border: 4px solid var(--primary-color); box-shadow: var(--shadow-xl);">
        </div>
        <h1 class="dashboard-title">Welcome back, ${user.name}!</h1>
        <p class="dashboard-subtitle">
          <i class="fas fa-${user.type === "employer" ? "briefcase" : "search"} me-2"></i>
          ${user.type === "employer" ? "Manage your job postings and find great candidates" : "Discover amazing job opportunities and advance your career"}
        </p>
      </div>

      <div class="action-buttons">
        ${
          user.type === "employer"
            ? `
              <a href="/post-job" class="action-btn btn-primary-custom">
                <i class="fas fa-plus-circle fa-lg"></i>
                <div>
                  <div class="fw-bold">Post New Job</div>
                  <small class="opacity-75">Find the perfect candidate</small>
                </div>
              </a>
              <a href="/employer/applicants" class="action-btn btn-success-custom">
                <i class="fas fa-users fa-lg"></i>
                <div>
                  <div class="fw-bold">View Applicants</div>
                  <small class="opacity-75">Review job applications</small>
                </div>
              </a>
            `
            : `
              <a href="/jobs" class="action-btn btn-primary-custom">
                <i class="fas fa-search fa-lg"></i>
                <div>
                  <div class="fw-bold">Browse Jobs</div>
                  <small class="opacity-75">Find your dream job</small>
                </div>
              </a>
              <a href="/my-applications" class="action-btn btn-success-custom">
                <i class="fas fa-file-alt fa-lg"></i>
                <div>
                  <div class="fw-bold">My Applications</div>
                  <small class="opacity-75">Track your progress</small>
                </div>
              </a>
            `
        }
      </div>

      <div class="mt-5">
        <div class="row g-4">
          <div class="col-md-6">
            <div class="card-custom hover-lift">
              <div class="card-body-custom text-center">
                <i class="fas fa-user fa-2x text-primary mb-3"></i>
                <h5 class="fw-bold">My Profile</h5>
                <p class="text-muted">Manage your profile information</p>
                <a href="/profile" class="btn btn-primary-custom btn-custom btn-sm">
                  <i class="fas fa-edit me-1"></i>View Profile
                </a>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card-custom hover-lift">
              <div class="card-body-custom text-center">
                <i class="fas fa-chart-line fa-2x text-success mb-3"></i>
                <h5 class="fw-bold">Activity</h5>
                <p class="text-muted">View your recent activity</p>
                <button class="btn btn-success-custom btn-custom btn-sm" disabled>
                  <i class="fas fa-chart-bar me-1"></i>Coming Soon
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `

  res.send(generateEnhancedHTML("Dashboard", content, user))
})

// Continue with other routes (post-job, jobs, apply, etc.) - keeping existing functionality
app.get("/post-job", (req, res) => {
  if (!req.session.user || req.session.user.type !== "employer") {
    const content = `
      <div class="text-center">
        <i class="fas fa-ban fa-3x text-danger mb-3"></i>
        <h2 class="fw-bold text-danger mb-3">Access Denied</h2>
        <div class="alert alert-danger-custom">
          <i class="fas fa-exclamation-triangle me-2"></i>
          <strong>Unauthorized Access!</strong><br>
          Only employers can post jobs. Please sign in with an employer account.
        </div>
        <div class="d-flex justify-content-center gap-3">
          <a href="/login" class="btn btn-primary-custom btn-custom">
            <i class="fas fa-sign-in-alt me-2"></i>Sign In
          </a>
          <a href="/register" class="btn btn-success-custom btn-custom">
            <i class="fas fa-user-plus me-2"></i>Create Employer Account
          </a>
        </div>
      </div>
    `
    return res.send(generateEnhancedHTML("Access Denied", content))
  }
  res.sendFile(path.join(__dirname, "views/post-job.html"))
})

app.post("/post-job", (req, res) => {
  const { title, company, location, description } = req.body
  const posted_by = req.session.user.id

  const query = `INSERT INTO jobs (title, company, location, description, posted_by) VALUES (?, ?, ?, ?, ?)`

  db.run(query, [title, company, location, description, posted_by], (err) => {
    if (err) {
      const content = `
        <div class="text-center">
          <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
          <h2 class="fw-bold text-danger mb-3">Job Posting Failed</h2>
          <div class="alert alert-danger-custom">
            <i class="fas fa-times-circle me-2"></i>
            <strong>Error!</strong> Failed to post your job. Please check your information and try again.
          </div>
          <div class="d-flex justify-content-center gap-3">
            <a href="/post-job" class="btn btn-primary-custom btn-custom">
              <i class="fas fa-redo me-2"></i>Try Again
            </a>
            <a href="/dashboard" class="btn btn-secondary-custom btn-custom">
              <i class="fas fa-arrow-left me-2"></i>Back to Dashboard
            </a>
          </div>
        </div>
      `
      return res.send(generateEnhancedHTML("Job Posting Failed", content, req.session.user))
    }

    const content = `
      <div class="text-center">
        <i class="fas fa-check-circle fa-3x text-success mb-3"></i>
        <h2 class="fw-bold text-success mb-3">Job Posted Successfully!</h2>
        <div class="alert alert-success-custom">
          <i class="fas fa-rocket me-2"></i>
          <strong>Congratulations!</strong><br>
          Your job posting "<strong>${title}</strong>" at <strong>${company}</strong> has been published successfully and is now live for job seekers to discover.
        </div>
        <div class="card-custom mt-4">
          <div class="card-body-custom">
            <h5 class="fw-bold mb-3">
              <i class="fas fa-briefcase me-2 text-primary"></i>Job Details
            </h5>
            <div class="row">
              <div class="col-md-6">
                <p><strong>Title:</strong> ${title}</p>
                <p><strong>Company:</strong> ${company}</p>
              </div>
              <div class="col-md-6">
                <p><strong>Location:</strong> ${location || "Not specified"}</p>
                <p><strong>Status:</strong> <span class="badge bg-success">Active</span></p>
              </div>
            </div>
          </div>
        </div>
        <div class="d-flex justify-content-center gap-3 mt-4">
          <a href="/post-job" class="btn btn-primary-custom btn-custom">
            <i class="fas fa-plus me-2"></i>Post Another Job
          </a>
          <a href="/employer/applicants" class="btn btn-success-custom btn-custom">
            <i class="fas fa-users me-2"></i>View Applicants
          </a>
          <a href="/dashboard" class="btn btn-secondary-custom btn-custom">
            <i class="fas fa-home me-2"></i>Back to Dashboard
          </a>
        </div>
      </div>
    `
    res.send(generateEnhancedHTML("Job Posted Successfully", content, req.session.user))
  })
})

// Job Listings
app.get("/jobs", (req, res) => {
  res.sendFile(path.join(__dirname, "views/jobs.html"))
})

app.get("/api/jobs", (req, res) => {
  const query = "SELECT * FROM jobs ORDER BY id DESC"
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch jobs" })
    // Remove the canApply logic since we'll handle this on frontend
    res.json(rows)
  })
})

// Apply Page
app.get("/apply/:jobId", (req, res) => {
  if (!req.session.user || req.session.user.type !== "user") {
    const content = `
      <div class="text-center">
        <i class="fas fa-user-lock fa-3x text-warning mb-3"></i>
        <h2 class="fw-bold text-warning mb-3">Access Restricted</h2>
        <div class="alert alert-danger-custom">
          <i class="fas fa-exclamation-triangle me-2"></i>
          <strong>Job Seekers Only!</strong><br>
          Only registered job seekers can apply for positions. Please sign in with a job seeker account.
        </div>
        <div class="d-flex justify-content-center gap-3">
          <a href="/login" class="btn btn-primary-custom btn-custom">
            <i class="fas fa-sign-in-alt me-2"></i>Sign In
          </a>
          <a href="/register" class="btn btn-success-custom btn-custom">
            <i class="fas fa-user-plus me-2"></i>Create Job Seeker Account
          </a>
        </div>
      </div>
    `
    return res.send(generateEnhancedHTML("Access Restricted", content))
  }
  res.sendFile(path.join(__dirname, "views/apply.html"))
})

// Submit Application with File Upload
app.post("/apply/:jobId", upload.single("resume"), (req, res) => {
  if (!req.session.user || req.session.user.type !== "user") {
    const content = `
      <div class="text-center">
        <i class="fas fa-ban fa-3x text-danger mb-3"></i>
        <h2 class="fw-bold text-danger mb-3">Access Denied</h2>
        <div class="alert alert-danger-custom">
          <i class="fas fa-exclamation-triangle me-2"></i>
          <strong>Unauthorized!</strong> Only job seekers can submit applications.
        </div>
        <a href="/login" class="btn btn-primary-custom btn-custom">
          <i class="fas fa-sign-in-alt me-2"></i>Sign In
        </a>
      </div>
    `
    return res.send(generateEnhancedHTML("Access Denied", content))
  }

  const jobId = req.params.jobId
  const userId = req.session.user.id
  const resume_url = "/uploads/resumes/" + req.file.filename

  const query = `INSERT INTO applications (user_id, job_id, resume_url) VALUES (?, ?, ?)`
  db.run(query, [userId, jobId, resume_url], (err) => {
    if (err) {
      const content = `
        <div class="text-center">
          <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
          <h2 class="fw-bold text-warning mb-3">Application Failed</h2>
          <div class="alert alert-danger-custom">
            <i class="fas fa-times-circle me-2"></i>
            <strong>Oops!</strong> Your application could not be submitted. You might have already applied for this position.
          </div>
          <div class="d-flex justify-content-center gap-3">
            <a href="/jobs" class="btn btn-primary-custom btn-custom">
              <i class="fas fa-search me-2"></i>Browse Other Jobs
            </a>
            <a href="/my-applications" class="btn btn-success-custom btn-custom">
              <i class="fas fa-file-alt me-2"></i>View My Applications
            </a>
          </div>
        </div>
      `
      return res.send(generateEnhancedHTML("Application Failed", content, req.session.user))
    }

    const content = `
      <div class="text-center">
        <i class="fas fa-paper-plane fa-3x text-success mb-3"></i>
        <h2 class="fw-bold text-success mb-3">Application Submitted!</h2>
        <div class="alert alert-success-custom">
          <i class="fas fa-check-circle me-2"></i>
          <strong>Success!</strong> Your application has been submitted successfully. The employer will review your resume and contact you if you're a good fit.
        </div>
        <div class="card-custom mt-4">
          <div class="card-body-custom">
            <h5 class="fw-bold mb-3">
              <i class="fas fa-info-circle me-2 text-info"></i>What's Next?
            </h5>
            <ul class="text-start">
              <li>Your resume has been sent to the employer</li>
              <li>You'll receive updates on your application status</li>
              <li>Keep applying to increase your chances</li>
              <li>Update your resume regularly for better results</li>
            </ul>
          </div>
        </div>
        <div class="d-flex justify-content-center gap-3 mt-4">
          <a href="/jobs" class="btn btn-primary-custom btn-custom">
            <i class="fas fa-search me-2"></i>Find More Jobs
          </a>
          <a href="/my-applications" class="btn btn-success-custom btn-custom">
            <i class="fas fa-file-alt me-2"></i>Track Applications
          </a>
          <a href="/dashboard" class="btn btn-secondary-custom btn-custom">
            <i class="fas fa-home me-2"></i>Dashboard
          </a>
        </div>
      </div>
    `
    res.send(generateEnhancedHTML("Application Submitted", content, req.session.user))
  })
})

// View My Applications
app.get("/my-applications", (req, res) => {
  if (!req.session.user || req.session.user.type !== "user") {
    const content = `
      <div class="text-center">
        <i class="fas fa-ban fa-3x text-danger mb-3"></i>
        <h2 class="fw-bold text-danger mb-3">Access Denied</h2>
        <div class="alert alert-danger-custom">
          <i class="fas fa-exclamation-triangle me-2"></i>
          <strong>Unauthorized!</strong> Only job seekers can view applications.
        </div>
        <a href="/login" class="btn btn-primary-custom btn-custom">
          <i class="fas fa-sign-in-alt me-2"></i>Sign In
        </a>
      </div>
    `
    return res.send(generateEnhancedHTML("Access Denied", content))
  }

  const userId = req.session.user.id
  const query = `SELECT jobs.title, jobs.company, jobs.location, applications.resume_url, jobs.id as job_id
                 FROM applications
                 JOIN jobs ON applications.job_id = jobs.id
                 WHERE applications.user_id = ?
                 ORDER BY applications.id DESC`

  db.all(query, [userId], (err, rows) => {
    if (err) {
      const content = `
        <div class="text-center">
          <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
          <h2 class="fw-bold text-danger mb-3">Error Loading Applications</h2>
          <div class="alert alert-danger-custom">
            <i class="fas fa-times-circle me-2"></i>
            <strong>Oops!</strong> Failed to retrieve your applications. Please try again later.
          </div>
          <a href="/dashboard" class="btn btn-primary-custom btn-custom">
            <i class="fas fa-home me-2"></i>Back to Dashboard
          </a>
        </div>
      `
      return res.send(generateEnhancedHTML("Error", content, req.session.user))
    }

    let content = `
      <div class="text-center mb-4">
        <i class="fas fa-file-alt fa-3x text-primary mb-3"></i>
        <h2 class="fw-bold mb-3">My Applications</h2>
        <p class="text-muted">Track your job application progress</p>
      </div>
    `

    if (rows.length === 0) {
      content += `
        <div class="text-center py-5">
          <i class="fas fa-search fa-3x text-muted mb-3"></i>
          <h4>No Applications Yet</h4>
          <p class="text-muted mb-4">You haven't applied to any jobs yet. Start exploring opportunities!</p>
          <a href="/jobs" class="btn btn-primary-custom btn-custom">
            <i class="fas fa-search me-2"></i>Browse Jobs
          </a>
        </div>
      `
    } else {
      content += `
        <div class="row g-4">
      `

      rows.forEach((job, index) => {
        content += `
          <div class="col-md-6">
            <div class="card-custom hover-lift" style="animation-delay: ${index * 0.1}s">
              <div class="card-body-custom">
                <div class="d-flex justify-content-between align-items-start mb-3">
                  <h5 class="job-title mb-0">${job.title}</h5>
                  <span class="badge bg-primary">Applied</span>
                </div>
                <div class="job-company mb-2">
                  <i class="fas fa-building me-2"></i>${job.company}
                </div>
                ${
                  job.location
                    ? `
                  <div class="job-location mb-3">
                    <i class="fas fa-map-marker-alt me-2"></i>${job.location}
                  </div>
                `
                    : ""
                }
                <div class="d-flex justify-content-between align-items-center">
                  <a href="${job.resume_url}" target="_blank" class="btn btn-success-custom btn-custom btn-sm">
                    <i class="fas fa-file-pdf me-2"></i>View Resume
                  </a>
                  <small class="text-muted">
                    <i class="fas fa-clock me-1"></i>Pending Review
                  </small>
                </div>
              </div>
            </div>
          </div>
        `
      })

      content += `
        </div>
        <div class="text-center mt-4">
          <p class="text-muted">
            <i class="fas fa-info-circle me-1"></i>
            Total Applications: <strong>${rows.length}</strong>
          </p>
        </div>
      `
    }

    res.send(generateEnhancedHTML("My Applications", content, req.session.user))
  })
})

// Employer View: Applicants
app.get("/employer/applicants", (req, res) => {
  if (!req.session.user || req.session.user.type !== "employer") {
    const content = `
      <div class="text-center">
        <i class="fas fa-ban fa-3x text-danger mb-3"></i>
        <h2 class="fw-bold text-danger mb-3">Access Denied</h2>
        <div class="alert alert-danger-custom">
          <i class="fas fa-exclamation-triangle me-2"></i>
          <strong>Employers Only!</strong> Only employers can view applicants.
        </div>
        <a href="/login" class="btn btn-primary-custom btn-custom">
          <i class="fas fa-sign-in-alt me-2"></i>Sign In
        </a>
      </div>
    `
    return res.send(generateEnhancedHTML("Access Denied", content))
  }

  const employerId = req.session.user.id

  const query = `SELECT jobs.title AS job_title, jobs.id AS job_id, users.name AS applicant_name, users.email, applications.resume_url
                 FROM jobs
                 LEFT JOIN applications ON jobs.id = applications.job_id
                 LEFT JOIN users ON applications.user_id = users.id
                 WHERE jobs.posted_by = ?
                 ORDER BY jobs.id DESC, applications.id DESC`

  db.all(query, [employerId], (err, rows) => {
    if (err) {
      const content = `
        <div class="text-center">
          <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
          <h2 class="fw-bold text-danger mb-3">Error Loading Applicants</h2>
          <div class="alert alert-danger-custom">
            <i class="fas fa-times-circle me-2"></i>
            <strong>Oops!</strong> Could not load applicant data. Please try again later.
          </div>
          <a href="/dashboard" class="btn btn-primary-custom btn-custom">
            <i class="fas fa-home me-2"></i>Back to Dashboard
          </a>
        </div>
      `
      return res.send(generateEnhancedHTML("Error", content, req.session.user))
    }

    let content = `
      <div class="text-center mb-4">
        <i class="fas fa-users fa-3x text-primary mb-3"></i>
        <h2 class="fw-bold mb-3">Job Applicants</h2>
        <p class="text-muted">Review applications for your job postings</p>
      </div>
    `

    if (rows.length === 0 || rows.every((row) => row.applicant_name === null)) {
      content += `
        <div class="text-center py-5">
          <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
          <h4>No Applications Yet</h4>
          <p class="text-muted mb-4">You haven't received any applications yet. Make sure your job postings are attractive!</p>
          <div class="d-flex justify-content-center gap-3">
            <a href="/post-job" class="btn btn-primary-custom btn-custom">
              <i class="fas fa-plus me-2"></i>Post New Job
            </a>
            <a href="/dashboard" class="btn btn-secondary-custom btn-custom">
              <i class="fas fa-home me-2"></i>Dashboard
            </a>
          </div>
        </div>
      `
    } else {
      // Group applications by job
      const jobGroups = {}
      rows.forEach((row) => {
        if (!jobGroups[row.job_title]) {
          jobGroups[row.job_title] = []
        }
        if (row.applicant_name) {
          jobGroups[row.job_title].push(row)
        }
      })

      Object.keys(jobGroups).forEach((jobTitle, jobIndex) => {
        const applicants = jobGroups[jobTitle]

        content += `
          <div class="card-custom mb-4 hover-lift" style="animation-delay: ${jobIndex * 0.1}s">
            <div class="card-header-custom">
              <div class="d-flex justify-content-between align-items-center">
                <h5 class="mb-0">
                  <i class="fas fa-briefcase me-2 text-primary"></i>${jobTitle}
                </h5>
                <span class="badge bg-primary">${applicants.length} Applicant${applicants.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
            <div class="card-body-custom">
        `

        if (applicants.length === 0) {
          content += `
            <p class="text-muted text-center py-3">
              <i class="fas fa-inbox me-2"></i>No applications for this job yet.
            </p>
          `
        } else {
          content += `<div class="row g-3">`

          applicants.forEach((applicant, index) => {
            content += `
              <div class="col-md-6">
                <div class="border rounded-3 p-3" style="background: var(--bg-secondary);">
                  <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 class="fw-bold mb-1">
                        <i class="fas fa-user me-2 text-success"></i>${applicant.applicant_name}
                      </h6>
                      <p class="text-muted mb-2">
                        <i class="fas fa-envelope me-2"></i>${applicant.email}
                      </p>
                    </div>
                    <span class="badge bg-success">New</span>
                  </div>
                  <a href="${applicant.resume_url}" target="_blank" class="btn btn-primary-custom btn-custom btn-sm">
                    <i class="fas fa-file-pdf me-2"></i>View Resume
                  </a>
                </div>
              </div>
            `
          })

          content += `</div>`
        }

        content += `
            </div>
          </div>
        `
      })
    }

    res.send(generateEnhancedHTML("Applicants", content, req.session.user))
  })
})

// API endpoint to check authentication status
app.get("/api/auth/status", (req, res) => {
  if (req.session.user) {
    res.json({
      authenticated: true,
      user: {
        id: req.session.user.id,
        name: req.session.user.name,
        email: req.session.user.email,
        type: req.session.user.type,
        profile_picture: req.session.user.profile_picture,
      },
    })
  } else {
    res.json({
      authenticated: false,
    })
  }
})

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Job Portal running at http://localhost:${PORT}`)
})
