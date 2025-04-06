document.addEventListener('DOMContentLoaded', function() {
    // Apply navbar styles and animations
    initNavbar();
    // Initialize smooth scrolling
    initSmoothScroll();
    // Set up animation observers for elements
    initAnimationObservers();
    // Set up hover animations for buttons
    initButtonAnimations();
    // Ensure all sections are visible with proper spacing
    initSectionVisibility();
    // Fix any styling issues
    fixStylingIssues();
});

// Navbar scroll effect
function initNavbar() {
    const navbar = document.querySelector(".navbar");
    
    // Add initial animation
    navbar.style.animation = 'navbarSlideDown 0.8s var(--ease-in-out) forwards';
    
    // Add scroll event listener
    window.addEventListener("scroll", function() {
        navbar.classList.toggle("scrolled", window.scrollY > 20);
    });
    
    // Fix shadow line issue
    navbar.style.boxShadow = 'none';
    navbar.style.borderBottom = 'none';
    
    // Create style element for additional overrides
    const style = document.createElement('style');
    style.textContent = `
        .navbar, .navbar.navbar-light, .navbar-expand-lg {
            box-shadow: none !important;
            border-bottom: none !important;
            border: none !important;
        }
        .navbar::after, .navbar::before {
            display: none !important;
        }
    `;
    document.head.appendChild(style);
}

// Smooth scroll for navigation
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId !== '#') {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    // Ensure target section is visible
                    targetElement.style.opacity = '1';
                    targetElement.style.visibility = 'visible';
                    
                    // Scroll with offset for fixed navbar
                    const navbarHeight = document.querySelector('.navbar').offsetHeight;
                    const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
}

// Initialize animations for elements when they enter viewport
function initAnimationObservers() {
    // Apply animations to hero section elements
    animateHeroElements();
    
    // Animate cards when they come into view
    animateCards();
    
    // Animate section headers
    animateSectionHeaders();
}

// Apply animations to hero section elements
function animateHeroElements() {
    const rectangleText = document.querySelector('.rectangle-text');
    const rectangleImage = document.querySelector('.rectangle-image');
    
    if (rectangleText) {
        rectangleText.style.animation = 'fadeInUp 1s var(--ease-in-out) forwards';
    }
    
    if (rectangleImage) {
        rectangleImage.style.animation = 'fadeInRight 1.2s var(--ease-in-cubic) forwards';
        rectangleImage.style.animationDelay = '0.2s';
    }
}

// Animate cards when they come into view
function animateCards() {
    // Select all card elements
    const animatedElements = document.querySelectorAll('.service-card, .feature-card, .info-card, .testimonial-card');
    
    // Create intersection observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            // Add animation when element is visible
            if (entry.isIntersecting) {
                // Determine which animation to use based on card type
                let animationName = 'fadeIn';
                if (entry.target.classList.contains('feature-card')) {
                    animationName = 'fadeInUp';
                } else if (entry.target.classList.contains('service-card')) {
                    animationName = 'fadeInRight';
                } else if (entry.target.classList.contains('info-card')) {
                    animationName = 'fadeInLeft';
                } else if (entry.target.classList.contains('testimonial-card')) {
                    animationName = 'slideInBottom';
                }
                
                // Apply the animation with staggered delay
                entry.target.style.animation = `${animationName} 0.8s var(--ease-in-out) forwards`;
                entry.target.style.animationDelay = `${0.1 + (index % 4) * 0.15}s`;
                
                // Add animated class
                entry.target.classList.add('animated');
                
                // Stop observing once animated
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1, // Trigger when 10% of element is visible
        rootMargin: '0px 0px -50px 0px' // Adjust trigger point
    });
    
    // Observe all elements that should be animated
    animatedElements.forEach(element => {
        element.style.opacity = '0'; // Start invisible
        observer.observe(element);
    });
}

// Animate section headers
function animateSectionHeaders() {
    const sectionHeaders = document.querySelectorAll('.section-header');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.8s var(--ease-in-out) forwards';
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    sectionHeaders.forEach(header => {
        header.style.opacity = '0'; // Start invisible
        observer.observe(header);
    });
}

// Setup hover animations for buttons
function initButtonAnimations() {
    const buttons = document.querySelectorAll('.book-appointment, .feature-btn, .directions-btn');
    
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.animation = 'pulseEffect 0.4s ease-in-out';
        });
        
        button.addEventListener('animationend', function() {
            this.style.animation = '';
        });
    });
}

// Ensure all sections are visible with proper spacing
function initSectionVisibility() {
    const sections = document.querySelectorAll('section');
    
    sections.forEach(section => {
        section.style.opacity = '1';
        section.style.overflow = 'visible';
        section.style.height = 'auto';
        section.style.minHeight = '100vh';
    });
    
    // Make all section content visible
    const sectionContents = document.querySelectorAll('.features-container, .services-grid, .info-container, .testimonials-container');
    sectionContents.forEach(content => {
        content.style.transform = 'none';
        content.style.position = 'relative';
        content.style.zIndex = '5';
    });
}

// Fix any styling issues
function fixStylingIssues() {
    // Fix scroll-snap issues that might be causing content to be hidden
    document.documentElement.style.scrollSnapType = 'none';
    setTimeout(() => {
        document.documentElement.style.scrollSnapType = 'y proximity';
    }, 100);
    
    // Ensure proper layout rendering
    window.dispatchEvent(new Event('resize'));
    
    // Apply gentle float animation to hero image
    const heroImage = document.querySelector('.rectangle-image img');
    if (heroImage) {
        heroImage.style.animation = 'gentleFloat 6s ease-in-out infinite';
    }
    
    // Add shimmer effect to book appointment button
    const bookButton = document.querySelector('.book-appointment');
    if (bookButton) {
        bookButton.style.position = 'relative';
        bookButton.style.overflow = 'hidden';
        
        const shimmerOverlay = document.createElement('div');
        shimmerOverlay.style.position = 'absolute';
        shimmerOverlay.style.top = '0';
        shimmerOverlay.style.left = '0';
        shimmerOverlay.style.width = '100%';
        shimmerOverlay.style.height = '100%';
        shimmerOverlay.style.background = 'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)';
        shimmerOverlay.style.backgroundSize = '200% 100%';
        shimmerOverlay.style.animation = 'shimmer 2s infinite';
        shimmerOverlay.style.pointerEvents = 'none';
        
        bookButton.appendChild(shimmerOverlay);
    }
}