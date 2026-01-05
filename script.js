(function() {
    'use strict';
    
    const App = {
        state: {
            initialized: false,
            navOpen: false,
            formSubmitting: false
        },
        
        config: {
            headerHeight: 80,
            debounceDelay: 150,
            throttleDelay: 100,
            animationDuration: 600
        },
        
        utils: {
            debounce(func, wait) {
                let timeout;
                return function executedFunction(...args) {
                    clearTimeout(timeout);
                    timeout = setTimeout(() => func.apply(this, args), wait);
                };
            },
            
            throttle(func, limit) {
                let inThrottle;
                return function(...args) {
                    if (!inThrottle) {
                        func.apply(this, args);
                        inThrottle = true;
                        setTimeout(() => inThrottle = false, limit);
                    }
                };
            },
            
            escapeHTML(str) {
                const div = document.createElement('div');
                div.textContent = str;
                return div.innerHTML;
            }
        },
        
        validators: {
            name(value) {
                if (!value || value.trim().length < 2) {
                    return 'Bitte geben Sie einen gültigen Namen ein (mindestens 2 Zeichen)';
                }
                if (!/^[a-zA-ZÀ-ÿ\s-']{2,50}$/.test(value)) {
                    return 'Der Name darf nur Buchstaben, Leerzeichen, Bindestriche und Apostrophe enthalten';
                }
                return null;
            },
            
            email(value) {
                if (!value || !value.trim()) {
                    return 'Bitte geben Sie Ihre E-Mail-Adresse ein';
                }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    return 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
                }
                return null;
            },
            
            phone(value, required = false) {
                if (!value || !value.trim()) {
                    return required ? 'Bitte geben Sie Ihre Telefonnummer ein' : null;
                }
                if (!/^[\d\s+\-()]{10,20}$/.test(value)) {
                    return 'Bitte geben Sie eine gültige Telefonnummer ein (10-20 Zeichen)';
                }
                return null;
            },
            
            message(value) {
                if (!value || value.trim().length < 10) {
                    return 'Bitte geben Sie eine Nachricht ein (mindestens 10 Zeichen)';
                }
                if (value.length > 1000) {
                    return 'Die Nachricht darf maximal 1000 Zeichen lang sein';
                }
                return null;
            },
            
            checkbox(checked) {
                return checked ? null : 'Bitte bestätigen Sie die Datenschutzerklärung';
            },
            
            select(value) {
                return value && value !== '' ? null : 'Bitte wählen Sie eine Option aus';
            }
        },
        
        nav: {
            init() {
                const nav = document.querySelector('.c-nav');
                const toggle = document.querySelector('.navbar-toggler, .c-nav__toggle');
                const navList = document.querySelector('.c-nav__list');
                const navCollapse = document.querySelector('.navbar-collapse');
                
                if (!toggle) return;
                
                const menuContainer = navCollapse || navList;
                if (!menuContainer) return;
                
                toggle.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.toggle(toggle, menuContainer);
                });
                
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && App.state.navOpen) {
                        this.close(toggle, menuContainer);
                        toggle.focus();
                    }
                });
                
                document.addEventListener('click', (e) => {
                    if (App.state.navOpen && nav && !nav.contains(e.target)) {
                        this.close(toggle, menuContainer);
                    }
                });
                
                const navLinks = document.querySelectorAll('.c-nav__link');
                navLinks.forEach(link => {
                    link.addEventListener('click', () => {
                        if (App.state.navOpen) {
                            this.close(toggle, menuContainer);
                        }
                    });
                });
                
                window.addEventListener('resize', App.utils.debounce(() => {
                    if (window.innerWidth >= 1024 && App.state.navOpen) {
                        this.close(toggle, menuContainer);
                    }
                }, App.config.debounceDelay));
            },
            
            toggle(toggle, container) {
                if (App.state.navOpen) {
                    this.close(toggle, container);
                } else {
                    this.open(toggle, container);
                }
            },
            
            open(toggle, container) {
                App.state.navOpen = true;
                container.classList.add('is-open');
                toggle.classList.add('is-open');
                toggle.setAttribute('aria-expanded', 'true');
                document.body.style.overflow = 'hidden';
                
                container.style.height = `calc(100vh - ${App.config.headerHeight}px)`;
                container.style.overflowY = 'auto';
            },
            
            close(toggle, container) {
                App.state.navOpen = false;
                container.classList.remove('is-open');
                toggle.classList.remove('is-open');
                toggle.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
                
                container.style.height = '';
                container.style.overflowY = '';
            }
        },
        
        forms: {
            init() {
                const forms = document.querySelectorAll('.c-form, form[class*="form"]');
                
                forms.forEach(form => {
                    form.addEventListener('submit', (e) => this.handleSubmit(e, form));
                    
                    const inputs = form.querySelectorAll('input, textarea, select');
                    inputs.forEach(input => {
                        input.addEventListener('blur', () => this.validateField(input));
                        input.addEventListener('input', () => {
                            if (input.classList.contains('has-error')) {
                                this.validateField(input);
                            }
                        });
                    });
                });
            },
            
            handleSubmit(e, form) {
                e.preventDefault();
                
                if (App.state.formSubmitting) return;
                
                const isValid = this.validateForm(form);
                
                if (!isValid) {
                    const firstError = form.querySelector('.has-error');
                    if (firstError) {
                        firstError.focus();
                        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    return;
                }
                
                const honeypot = form.querySelector('input[name="website"], input[type="hidden"][name*="bot"]');
                if (honeypot && honeypot.value !== '') {
                    return;
                }
                
                this.submitForm(form);
            },
            
            validateForm(form) {
                const fields = form.querySelectorAll('input:not([type="hidden"]), textarea, select');
                let isValid = true;
                
                fields.forEach(field => {
                    if (!this.validateField(field)) {
                        isValid = false;
                    }
                });
                
                return isValid;
            },
            
            validateField(field) {
                const fieldType = field.type;
                const fieldName = field.name || field.id;
                const fieldValue = field.value;
                const isRequired = field.hasAttribute('required') || field.getAttribute('aria-required') === 'true';
                
                let error = null;
                
                if (fieldType === 'checkbox') {
                    if (isRequired) {
                        error = App.validators.checkbox(field.checked);
                    }
                } else if (fieldType === 'email' || fieldName.includes('email')) {
                    error = App.validators.email(fieldValue);
                } else if (fieldType === 'tel' || fieldName.includes('phone')) {
                    error = App.validators.phone(fieldValue, isRequired);
                } else if (field.tagName === 'TEXTAREA' || fieldName.includes('message')) {
                    if (isRequired) {
                        error = App.validators.message(fieldValue);
                    }
                } else if (field.tagName === 'SELECT') {
                    if (isRequired) {
                        error = App.validators.select(fieldValue);
                    }
                } else if (fieldName.includes('name') || fieldName === 'firstName' || fieldName === 'lastName') {
                    if (isRequired) {
                        error = App.validators.name(fieldValue);
                    }
                } else if (isRequired && (!fieldValue || !fieldValue.trim())) {
                    error = 'Dieses Feld ist erforderlich';
                }
                
                this.displayError(field, error);
                
                return error === null;
            },
            
            displayError(field, error) {
                const parent = field.closest('.c-form__group') || field.closest('.mb-3') || field.parentElement;
                
                field.classList.remove('has-error', 'is-invalid');
                parent.classList.remove('has-error');
                
                let errorElement = parent.querySelector('.c-form__error, .invalid-feedback');
                
                if (error) {
                    field.classList.add('has-error', 'is-invalid');
                    parent.classList.add('has-error');
                    
                    if (!errorElement) {
                        errorElement = document.createElement('div');
                        errorElement.className = 'c-form__error invalid-feedback';
                        parent.appendChild(errorElement);
                    }
                    
                    errorElement.textContent = error;
                    errorElement.style.display = 'block';
                    field.setAttribute('aria-invalid', 'true');
                } else {
                    if (errorElement) {
                        errorElement.style.display = 'none';
                    }
                    field.removeAttribute('aria-invalid');
                }
            },
            
            submitForm(form) {
                const submitBtn = form.querySelector('button[type="submit"]');
                const originalText = submitBtn ? submitBtn.innerHTML : '';
                
                App.state.formSubmitting = true;
                
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Wird gesendet...';
                }
                
                setTimeout(() => {
                    window.location.href = 'thank_you.html';
                }, 800);
            }
        },
        
        animations: {
            init() {
                this.initScrollAnimations();
                this.initButtonEffects();
                this.initCardEffects();
                this.initImageAnimations();
                this.initCounters();
            },
            
            initScrollAnimations() {
                const elements = document.querySelectorAll('.card, .c-card, .c-form, section, .hero-section');
                
                if (!('IntersectionObserver' in window)) {
                    elements.forEach(el => {
                        el.style.opacity = '1';
                        el.style.transform = 'translateY(0)';
                    });
                    return;
                }
                
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.style.opacity = '1';
                            entry.target.style.transform = 'translateY(0)';
                        }
                    });
                }, {
                    threshold: 0.1,
                    rootMargin: '0px 0px -50px 0px'
                });
                
                elements.forEach((el, index) => {
                    el.style.opacity = '0';
                    el.style.transform = 'translateY(30px)';
                    el.style.transition = `all 0.8s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.1}s`;
                    observer.observe(el);
                });
            },
            
            initButtonEffects() {
                const buttons = document.querySelectorAll('.btn, .c-button, button, a[class*="btn"]');
                
                buttons.forEach(button => {
                    button.addEventListener('mouseenter', function() {
                        this.style.transform = 'translateY(-2px)';
                    });
                    
                    button.addEventListener('mouseleave', function() {
                        this.style.transform = 'translateY(0)';
                    });
                    
                    button.addEventListener('click', function(e) {
                        const ripple = document.createElement('span');
                        const rect = this.getBoundingClientRect();
                        const size = Math.max(rect.width, rect.height);
                        const x = e.clientX - rect.left - size / 2;
                        const y = e.clientY - rect.top - size / 2;
                        
                        ripple.style.cssText = `
                            position: absolute;
                            width: ${size}px;
                            height: ${size}px;
                            top: ${y}px;
                            left: ${x}px;
                            background: rgba(255, 255, 255, 0.5);
                            border-radius: 50%;
                            transform: scale(0);
                            animation: ripple 0.6s ease-out;
                            pointer-events: none;
                        `;
                        
                        this.style.position = 'relative';
                        this.style.overflow = 'hidden';
                        this.appendChild(ripple);
                        
                        setTimeout(() => ripple.remove(), 600);
                    });
                });
                
                if (!document.getElementById('ripple-animation')) {
                    const style = document.createElement('style');
                    style.id = 'ripple-animation';
                    style.textContent = `
                        @keyframes ripple {
                            to {
                                transform: scale(2);
                                opacity: 0;
                            }
                        }
                    `;
                    document.head.appendChild(style);
                }
            },
            
            initCardEffects() {
                const cards = document.querySelectorAll('.card, .c-card, .animal-card, .feature-card');
                
                cards.forEach(card => {
                    card.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
                    
                    card.addEventListener('mouseenter', function() {
                        this.style.transform = 'translateY(-8px) scale(1.02)';
                        this.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.15)';
                    });
                    
                    card.addEventListener('mouseleave', function() {
                        this.style.transform = 'translateY(0) scale(1)';
                        this.style.boxShadow = '';
                    });
                });
            },
            
            initImageAnimations() {
                const images = document.querySelectorAll('img');
                
                images.forEach(img => {
                    if (!img.hasAttribute('loading')) {
                        img.setAttribute('loading', 'lazy');
                    }
                    
                    if (img.complete) {
                        img.style.opacity = '1';
                    } else {
                        img.style.opacity = '0';
                        img.style.transition = 'opacity 0.6s ease-in-out';
                        
                        img.addEventListener('load', function() {
                            this.style.opacity = '1';
                        });
                    }
                });
            },
            
            initCounters() {
                const counters = document.querySelectorAll('.counter, [data-counter]');
                
                if (counters.length === 0) return;
                
                const animateCounter = (element) => {
                    const target = parseInt(element.textContent) || parseInt(element.getAttribute('data-target')) || 0;
                    const duration = 2000;
                    const steps = 60;
                    const increment = target / steps;
                    let current = 0;
                    
                    const timer = setInterval(() => {
                        current += increment;
                        if (current >= target) {
                            element.textContent = target;
                            clearInterval(timer);
                        } else {
                            element.textContent = Math.floor(current);
                        }
                    }, duration / steps);
                };
                
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
                            entry.target.classList.add('counted');
                            animateCounter(entry.target);
                            observer.unobserve(entry.target);
                        }
                    });
                }, { threshold: 0.5 });
                
                counters.forEach(counter => observer.observe(counter));
            }
        },
        
        filters: {
            init() {
                const filterButtons = document.querySelectorAll('.c-filter-btn, [data-filter]');
                const portfolioItems = document.querySelectorAll('.portfolio-item, [data-category]');
                
                if (filterButtons.length === 0) return;
                
                filterButtons.forEach(button => {
                    button.addEventListener('click', () => {
                        const filter = button.getAttribute('data-filter');
                        
                        filterButtons.forEach(btn => btn.classList.remove('active'));
                        button.classList.add('active');
                        
                        portfolioItems.forEach(item => {
                            const category = item.getAttribute('data-category');
                            
                            if (filter === 'all' || category === filter) {
                                item.style.display = '';
                                item.style.opacity = '0';
                                item.style.transform = 'scale(0.8)';
                                
                                setTimeout(() => {
                                    item.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                                    item.style.opacity = '1';
                                    item.style.transform = 'scale(1)';
                                }, 50);
                            } else {
                                item.style.opacity = '0';
                                item.style.transform = 'scale(0.8)';
                                setTimeout(() => {
                                    item.style.display = 'none';
                                }, 300);
                            }
                        });
                    });
                });
            }
        },
        
        smoothScroll: {
            init() {
                document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                    anchor.addEventListener('click', function(e) {
                        const href = this.getAttribute('href');
                        if (href === '#' || href === '#!') return;
                        
                        const targetId = href.substring(1);
                        const targetElement = document.getElementById(targetId);
                        
                        if (targetElement) {
                            e.preventDefault();
                            
                            const headerOffset = App.config.headerHeight;
                            const elementPosition = targetElement.getBoundingClientRect().top;
                            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                            
                            window.scrollTo({
                                top: offsetPosition,
                                behavior: 'smooth'
                            });
                        }
                    });
                });
            }
        },
        
        scrollToTop: {
            init() {
                const button = document.createElement('button');
                button.className = 'scroll-to-top';
                button.innerHTML = '↑';
                button.setAttribute('aria-label', 'Nach oben scrollen');
                button.style.cssText = `
                    position: fixed;
                    bottom: 2rem;
                    right: 2rem;
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    background: var(--color-primary);
                    color: white;
                    border: none;
                    cursor: pointer;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                    z-index: 999;
                    font-size: 1.5rem;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                `;
                
                document.body.appendChild(button);
                
                const toggleButton = () => {
                    if (window.pageYOffset > 300) {
                        button.style.opacity = '1';
                        button.style.visibility = 'visible';
                    } else {
                        button.style.opacity = '0';
                        button.style.visibility = 'hidden';
                    }
                };
                
                window.addEventListener('scroll', App.utils.throttle(toggleButton, 100));
                
                button.addEventListener('click', () => {
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                });
                
                button.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateY(-3px) scale(1.1)';
                    this.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)';
                });
                
                button.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateY(0) scale(1)';
                    this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                });
            }
        },
        
        init() {
            if (this.state.initialized) return;
            this.state.initialized = true;
            
            this.nav.init();
            this.forms.init();
            this.animations.init();
            this.filters.init();
            this.smoothScroll.init();
            this.scrollToTop.init();
        }
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => App.init());
    } else {
        App.init();
    }
    
})();