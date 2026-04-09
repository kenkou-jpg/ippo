/**
 * ippo — main.js
 * ブーゲンビリア × 白壁 × ターコイズ窓
 * 上品・静か・知的・女性的
 */

(function () {
  'use strict';

  /* ============================================
     ★ サイト設定 — ここを編集してください ★
     BLOG_URL:https://kenkou-kiroku.com
     PROFILE_NAME:SUMI
  ============================================ */
  const SITE_CONFIG = {
    BLOG_URL: 'BLOG_URL_HERE',   // 例: 'https://kenkou-kiroku.com'
    PROFILE_NAME: 'SUMI', // 例: '田中 花子'
  };

  /* ============================================
     Blog URL & Profile Name — 自動適用
  ============================================ */
  function applyConfig() {
    const blogUrl = SITE_CONFIG.BLOG_URL;
    const profileName = SITE_CONFIG.PROFILE_NAME;
    const hasBlogUrl = blogUrl && blogUrl !== 'BLOG_URL_HERE';

    // ブログURLをすべてのリンクに適用
    document.querySelectorAll('a[href="BLOG_URL_HERE"]').forEach(link => {
      if (hasBlogUrl) {
        link.setAttribute('href', blogUrl);
      } else {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          showSetupNotice();
        });
      }
    });

    // プロフィール名を適用
    const nameEls = document.querySelectorAll(
      '#profile-name-display, #article-author-name, .profile-name, .author-name'
    );
    nameEls.forEach(el => {
      if (el.textContent.includes('お名前') || el.textContent.includes('こちらに')) {
        el.textContent = profileName;
      }
    });

    // 設定通知バナー（未設定時のみ）
    if (!hasBlogUrl) {
      showSetupBanner();
    }
  }

  function showSetupBanner() {
    const existing = document.getElementById('setup-notice');
    if (existing) return;

    const notice = document.createElement('div');
    notice.id = 'setup-notice';
    notice.className = 'setup-notice';
    notice.innerHTML = `
      <button class="setup-notice-close" onclick="this.parentElement.remove()" aria-label="閉じる">×</button>
      <strong>⚙ 設定をしてください</strong>
      js/main.js の SITE_CONFIG を編集し、<br>
      ブログURLとプロフィール名を設定してください。
    `;
    document.body.appendChild(notice);

    // 8秒後に自動で消す
    setTimeout(() => {
      if (notice.parentElement) {
        notice.style.opacity = '0';
        notice.style.transition = 'opacity 0.5s';
        setTimeout(() => notice.remove(), 500);
      }
    }, 8000);
  }

  function showSetupNotice() {
    alert('js/main.js の SITE_CONFIG.BLOG_URL にブログのURLを設定してください。');
  }

  // DOM準備後に適用
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyConfig);
  } else {
    applyConfig();
  }

  /* ============================================
     Header scroll behavior
  ============================================ */
  const header = document.getElementById('site-header');

  function onScroll() {
    if (!header) return;
    if (window.scrollY > 30) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run on load

  /* ============================================
     Hamburger / Mobile Nav
  ============================================ */
  const hamburger = document.getElementById('hamburger-btn');
  const mobileNav = document.getElementById('mobile-nav');

  function closeMobileNav() {
    if (!mobileNav || !hamburger) return;
    mobileNav.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  function openMobileNav() {
    if (!mobileNav || !hamburger) return;
    mobileNav.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      const isOpen = mobileNav.classList.contains('open');
      if (isOpen) {
        closeMobileNav();
      } else {
        openMobileNav();
      }
    });

    // Close on any mobile nav link click
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeMobileNav);
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMobileNav();
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (
        mobileNav.classList.contains('open') &&
        !mobileNav.contains(e.target) &&
        !hamburger.contains(e.target)
      ) {
        closeMobileNav();
      }
    });
  }

  /* ============================================
     FAQ accordion
  ============================================ */
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const btn = item.querySelector('.faq-question');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      // Close all
      faqItems.forEach(el => {
        el.classList.remove('open');
        const q = el.querySelector('.faq-question');
        if (q) q.setAttribute('aria-expanded', 'false');
      });

      // Toggle current
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ============================================
     Smooth scroll for anchor links
  ============================================ */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      closeMobileNav();

      const headerHeight = header ? header.offsetHeight : 80;
      const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 16;

      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* ============================================
     Intersection Observer — fade in on scroll
  ============================================ */
  const style = document.createElement('style');
  style.textContent = `
    .fade-in {
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.6s ease, transform 0.6s ease;
    }
    .fade-in.visible {
      opacity: 1;
      transform: translateY(0);
    }
    .fade-in.delay-1 { transition-delay: 0.1s; }
    .fade-in.delay-2 { transition-delay: 0.2s; }
    .fade-in.delay-3 { transition-delay: 0.3s; }
    .fade-in.delay-4 { transition-delay: 0.4s; }
  `;
  document.head.appendChild(style);

  // Add fade-in to key elements
  const fadeTargets = document.querySelectorAll(
    '.pillar-card, .concern-card, .article-card, .feature-card, .disease-card, .article-list-item'
  );

  fadeTargets.forEach((el, i) => {
    el.classList.add('fade-in');
    if (i % 4 === 1) el.classList.add('delay-1');
    if (i % 4 === 2) el.classList.add('delay-2');
    if (i % 4 === 3) el.classList.add('delay-3');
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
  } else {
    // Fallback for browsers without IntersectionObserver
    document.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible'));
  }

  /* ============================================
     Pre-registration form (placeholder)
  ============================================ */
  const preregForm = document.querySelector('.prereg-form');
  if (preregForm) {
    preregForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = preregForm.querySelector('input[type="email"]');
      const btn = preregForm.querySelector('button[type="submit"]');
      const email = input ? input.value.trim() : '';

      if (!email) return;

      // Simulate submission
      if (btn) {
        btn.textContent = '登録完了 ✓';
        btn.style.background = '#4CAF50';
        btn.style.borderColor = '#4CAF50';
        btn.disabled = true;
      }

      if (input) {
        input.disabled = true;
        input.value = '';
        input.placeholder = 'ご登録ありがとうございます';
      }
    });
  }

  /* ============================================
     Active nav highlight for current page
  ============================================ */
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.includes(currentPath) && !href.includes('#')) {
      link.style.color = 'var(--color-teal)';
    }
  });

})();
