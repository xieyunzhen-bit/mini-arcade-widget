/**
 * DAEBAK DAILY - K-POP BLOG ENGINE
 * All-Generation Interactive Blog Application
 */

(function () {
  'use strict';

  // =========================================================================
  // APP STATE & STORAGE
  // =========================================================================
  const STORAGE_KEYS = {
    USER_POSTS: 'daebak_user_posts',
    LIKES: 'daebak_liked_posts',
    SAVED: 'daebak_saved_posts',
    COMMENTS: 'daebak_post_comments',
    CHEERS: 'daebak_cheer_count',
    THEME: 'daebak_theme'
  };

  let allPosts = [];
  let currentGenFilter = 'all';
  let currentTypeFilter = 'all';
  let currentCatFilter = 'all';
  let searchQuery = '';
  let currentSort = 'newest';

  let likedPostIds = new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.LIKES) || '[]'));
  let savedPostIds = new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED) || '[]'));
  let postComments = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMMENTS) || '{}');
  let cheerCount = parseInt(localStorage.getItem(STORAGE_KEYS.CHEERS) || '9842', 10);
  let activeLightstick = LIGHTSTICKS[0];
  let currentlyOpenPostId = null;

  // =========================================================================
  // WEB AUDIO API - SOUND EFFECTS SYNTHESIZER
  // (Provides fun, cute chimes without relying on external audio files)
  // =========================================================================
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
  }

  function playSparkleSound() {
    try {
      initAudio();
      if (!audioCtx) return;
      const now = audioCtx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Bright Chord)
      
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0, now + idx * 0.05);
        gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.05 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.28);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.3);
      });
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  function playCheerChime() {
    try {
      initAudio();
      if (!audioCtx) return;
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {}
  }

  function playKpopMelodySnippet() {
    try {
      initAudio();
      if (!audioCtx) return;
      const now = audioCtx.currentTime;
      // Upbeat synth riff (E5 -> G#5 -> B5 -> C#6 -> B5)
      const sequence = [
        { f: 659.25, d: 0.14 },
        { f: 830.61, d: 0.14 },
        { f: 987.77, d: 0.16 },
        { f: 1108.73, d: 0.22 },
        { f: 987.77, d: 0.3 }
      ];

      let elapsed = 0;
      sequence.forEach((item) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(item.f, now + elapsed);

        gain.gain.setValueAtTime(0.08, now + elapsed);
        gain.gain.exponentialRampToValueAtTime(0.001, now + elapsed + item.d);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + elapsed);
        osc.stop(now + elapsed + item.d + 0.05);

        elapsed += item.d;
      });
    } catch (e) {}
  }

  // =========================================================================
  // DOM ELEMENT SELECTIONS
  // =========================================================================
  const postsGrid = document.getElementById('postsGrid');
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const resultsCountText = document.getElementById('resultsCountText');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const savedPostsBtn = document.getElementById('savedPostsBtn');
  const savedCountBadge = document.getElementById('savedCountBadge');
  const openWriteModalBtn = document.getElementById('openWriteModalBtn');
  const openPhotocardBtn = document.getElementById('openPhotocardBtn');
  const openCheerWidgetBtn = document.getElementById('openCheerWidgetBtn');

  // Hero interactive
  const cheerCounterText = document.getElementById('cheerCounterText');
  const lightstickPickerRow = document.getElementById('lightstickPickerRow');
  const cheerHeartBtn = document.getElementById('cheerHeartBtn');
  const cheerLightstickEmoji = document.getElementById('cheerLightstickEmoji');
  const spinSongBtn = document.getElementById('spinSongBtn');
  const recSongTitle = document.getElementById('recSongTitle');
  const recArtistName = document.getElementById('recArtistName');
  const biasResultContainer = document.getElementById('biasResultContainer');

  // Modals
  const articleModal = document.getElementById('articleModal');
  const closeArticleModalBtn = document.getElementById('closeArticleModalBtn');
  const modalCoverImg = document.getElementById('modalCoverImg');
  const modalBadges = document.getElementById('modalBadges');
  const modalTitle = document.getElementById('modalTitle');
  const modalAuthorName = document.getElementById('modalAuthorName');
  const modalDate = document.getElementById('modalDate');
  const modalReadTime = document.getElementById('modalReadTime');
  const modalTrackName = document.getElementById('modalTrackName');
  const modalArticleText = document.getElementById('modalArticleText');
  const modalTagsContainer = document.getElementById('modalTagsContainer');
  const playAudioChimeBtn = document.getElementById('playAudioChimeBtn');
  const commentForm = document.getElementById('commentForm');
  const modalCommentsList = document.getElementById('modalCommentsList');
  const commentsCountHeader = document.getElementById('commentsCountHeader');

  const photocardModal = document.getElementById('photocardModal');
  const closePhotocardModalBtn = document.getElementById('closePhotocardModalBtn');
  const photocardGrid = document.getElementById('photocardGrid');

  const writeModal = document.getElementById('writeModal');
  const closeWriteModalBtn = document.getElementById('closeWriteModalBtn');
  const writePostForm = document.getElementById('writePostForm');

  const savedModal = document.getElementById('savedModal');
  const closeSavedModalBtn = document.getElementById('closeSavedModalBtn');
  const savedListContainer = document.getElementById('savedListContainer');

  // =========================================================================
  // INITIALIZATION
  // =========================================================================
  function init() {
    loadPostsData();
    setupTheme();
    setupEventListeners();
    renderLightstickPicker();
    renderPhotocards();
    renderPosts();
    updateSavedCountBadge();
    setupHeroFeaturedPost();
  }

  function loadPostsData() {
    const userPosts = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_POSTS) || '[]');
    allPosts = [...userPosts, ...INITIAL_POSTS];
  }

  function setupTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'pop';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
  }

  function updateThemeIcon(theme) {
    if (theme === 'stage') {
      themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun" style="color:#fbbf24;"></i>';
    } else {
      themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
  }

  function toggleTheme() {
    const current = document.body.getAttribute('data-theme') || 'pop';
    const next = current === 'pop' ? 'stage' : 'pop';
    document.body.setAttribute('data-theme', next);
    localStorage.setItem(STORAGE_KEYS.THEME, next);
    updateThemeIcon(next);
    playSparkleSound();
  }

  // =========================================================================
  // HERO FEATURED POST & LIGHTSTICKS
  // =========================================================================
  function setupHeroFeaturedPost() {
    const featured = allPosts.find(p => p.featured) || allPosts[0];
    if (!featured) return;

    const heroTitle = document.getElementById('heroTitle');
    const heroSummary = document.getElementById('heroSummary');
    const heroAuthorImg = document.getElementById('heroAuthorImg');
    const heroAuthorName = document.getElementById('heroAuthorName');
    const heroAuthorRole = document.getElementById('heroAuthorRole');
    const heroReadBtn = document.getElementById('heroReadBtn');

    if (heroTitle) heroTitle.textContent = featured.title;
    if (heroSummary) heroSummary.textContent = featured.summary;
    if (heroAuthorImg) heroAuthorImg.src = featured.author.avatar;
    if (heroAuthorName) heroAuthorName.textContent = featured.author.name;
    if (heroAuthorRole) heroAuthorRole.textContent = `${featured.author.role} • ${featured.readTime}`;

    if (heroReadBtn) {
      heroReadBtn.onclick = () => openArticle(featured.id);
    }
  }

  function renderLightstickPicker() {
    if (!lightstickPickerRow) return;
    lightstickPickerRow.innerHTML = '';

    LIGHTSTICKS.forEach((ls, idx) => {
      const btn = document.createElement('button');
      btn.className = `lightstick-btn ${idx === 0 ? 'active' : ''}`;
      btn.innerHTML = `<span>${ls.emoji}</span> ${ls.name}`;
      btn.onclick = () => {
        document.querySelectorAll('.lightstick-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeLightstick = ls;
        cheerLightstickEmoji.textContent = ls.emoji;
        playSparkleSound();
      };
      lightstickPickerRow.appendChild(btn);
    });

    if (cheerCounterText) {
      cheerCounterText.textContent = `${cheerCount.toLocaleString()} Cheers`;
    }
  }

  function triggerCheer(e) {
    cheerCount += 1;
    localStorage.setItem(STORAGE_KEYS.CHEERS, cheerCount.toString());
    cheerCounterText.textContent = `${cheerCount.toLocaleString()} Cheers`;

    playCheerChime();

    // Create floating cheer particles
    const rect = cheerHeartBtn.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top;

    for (let i = 0; i < 7; i++) {
      createCheerParticle(originX, originY, activeLightstick.emoji);
    }
  }

  function createCheerParticle(x, y, emoji) {
    const p = document.createElement('div');
    p.className = 'floating-cheer-particle';
    const emojis = [emoji, '💖', '✨', '🌟', '🍭', '🔥', '💜'];
    p.textContent = emojis[Math.floor(Math.random() * emojis.length)];

    const randX = (Math.random() - 0.5) * 160;
    const randRot = (Math.random() - 0.5) * 60;
    p.style.setProperty('--rand-x', `${randX}px`);
    p.style.setProperty('--rand-rot', `${randRot}deg`);
    p.style.left = `${x + (Math.random() - 0.5) * 40}px`;
    p.style.top = `${y}px`;

    document.body.appendChild(p);

    setTimeout(() => {
      p.remove();
    }, 1600);
  }

  function spinRecommendation() {
    biasResultContainer.classList.add('spin-anim');
    playSparkleSound();

    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * DAILY_RECOMMENDATIONS.length);
      const chosen = DAILY_RECOMMENDATIONS[randomIndex];
      recSongTitle.textContent = chosen.title;
      recArtistName.textContent = `${chosen.artist} • ${chosen.gen} (${chosen.vibe})`;
      biasResultContainer.classList.remove('spin-anim');
    }, 300);
  }

  // =========================================================================
  // RENDER BLOG POSTS & FILTERING
  // =========================================================================
  function getFilteredPosts() {
    let filtered = allPosts.filter(post => {
      // Generation filter
      if (currentGenFilter !== 'all' && post.generation !== currentGenFilter) {
        return false;
      }
      // Type filter
      if (currentTypeFilter !== 'all' && post.type !== currentTypeFilter) {
        return false;
      }
      // Category filter
      if (currentCatFilter !== 'all' && post.category !== currentCatFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesTitle = post.title.toLowerCase().includes(q);
        const matchesSummary = post.summary.toLowerCase().includes(q);
        const matchesTags = post.tags && post.tags.some(t => t.toLowerCase().includes(q));
        const matchesAuthor = post.author.name.toLowerCase().includes(q);
        if (!matchesTitle && !matchesSummary && !matchesTags && !matchesAuthor) {
          return false;
        }
      }
      return true;
    });

    // Sort
    if (currentSort === 'likes') {
      filtered.sort((a, b) => (b.likes + (likedPostIds.has(b.id) ? 1 : 0)) - (a.likes + (likedPostIds.has(a.id) ? 1 : 0)));
    } else if (currentSort === 'reading') {
      filtered.sort((a, b) => parseInt(a.readTime) - parseInt(b.readTime));
    } else {
      // Default: keep array order (newest first)
    }

    return filtered;
  }

  function renderPosts() {
    if (!postsGrid) return;
    const posts = getFilteredPosts();

    // Results counter update
    resultsCountText.textContent = `Showing ${posts.length} curated ${posts.length === 1 ? 'story' : 'stories'}`;
    const isFiltered = currentGenFilter !== 'all' || currentTypeFilter !== 'all' || currentCatFilter !== 'all' || searchQuery !== '';
    resetFiltersBtn.style.display = isFiltered ? 'inline-block' : 'none';

    if (posts.length === 0) {
      postsGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🌸</div>
          <h3 style="font-size:1.4rem; font-weight:800; margin-bottom:0.5rem;">No K-Pop Stories Found</h3>
          <p style="color:var(--text-muted); max-width:400px; margin:0 auto 1.5rem;">We couldn't find any articles matching your search criteria. Try selecting another generation or clearing your keywords!</p>
          <button class="btn-pill-primary" id="emptyStateResetBtn"><i class="fa-solid fa-rotate-left"></i> Reset Search & Filters</button>
        </div>
      `;
      const emptyBtn = document.getElementById('emptyStateResetBtn');
      if (emptyBtn) emptyBtn.onclick = resetAllFilters;
      return;
    }

    postsGrid.innerHTML = posts.map(post => {
      const isLiked = likedPostIds.has(post.id);
      const isSaved = savedPostIds.has(post.id);
      const displayLikes = post.likes + (isLiked ? 1 : 0);
      const commentCount = (postComments[post.id] || []).length;

      return `
        <article class="post-card" data-post-id="${post.id}">
          <div class="post-card-thumb-wrap">
            <img src="${post.coverImage}" alt="${post.coverAlt || post.title}" class="post-card-thumb" loading="lazy">
            <span class="post-badge-top">${post.badge || `${post.generation} Gen`}</span>
            <button class="post-bookmark-btn ${isSaved ? 'saved' : ''}" data-bookmark-id="${post.id}" title="${isSaved ? 'Remove from Binder' : 'Save to Binder'}" aria-label="Bookmark">
              <i class="${isSaved ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i>
            </button>
          </div>

          <div class="post-card-body">
            <div class="post-card-tags">
              <span class="tag-pill tag-gen-${post.generation}">${post.generation} Gen</span>
              <span class="tag-pill tag-type-${post.type}">${post.type === 'group' ? 'Group 👥' : 'Soloist 🌟'}</span>
              <span class="tag-pill" style="background:var(--purple-soft); color:var(--purple-pop);">${post.category}</span>
            </div>

            <h3 class="post-card-title" data-open-id="${post.id}">${post.title}</h3>
            <p class="post-card-excerpt">${post.summary}</p>

            <div class="post-card-meta">
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <img src="${post.author.avatar}" alt="${post.author.name}" style="width:24px; height:24px; border-radius:50%; object-fit:cover;">
                <span>${post.author.name}</span>
                <span>•</span>
                <span>${post.readTime}</span>
              </div>

              <div class="post-card-actions">
                <button class="card-action-btn ${isLiked ? 'liked' : ''}" data-like-id="${post.id}" aria-label="Like article">
                  <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                  <span>${displayLikes}</span>
                </button>
                <button class="card-action-btn" data-open-id="${post.id}" aria-label="Comments">
                  <i class="fa-regular fa-comment"></i>
                  <span>${commentCount}</span>
                </button>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Attach card event listeners
    attachCardListeners();
  }

  function attachCardListeners() {
    // Open article readers
    document.querySelectorAll('[data-open-id]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-open-id');
        openArticle(id);
      });
    });

    // Likes
    document.querySelectorAll('[data-like-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-like-id');
        toggleLike(id, btn);
      });
    });

    // Bookmarks
    document.querySelectorAll('[data-bookmark-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-bookmark-id');
        toggleBookmark(id, btn);
      });
    });
  }

  function toggleLike(postId, btn) {
    playSparkleSound();
    if (likedPostIds.has(postId)) {
      likedPostIds.delete(postId);
    } else {
      likedPostIds.add(postId);
      const rect = btn.getBoundingClientRect();
      createCheerParticle(rect.left + 15, rect.top, '💖');
    }
    localStorage.setItem(STORAGE_KEYS.LIKES, JSON.stringify([...likedPostIds]));
    renderPosts();
  }

  function toggleBookmark(postId, btn) {
    playSparkleSound();
    if (savedPostIds.has(postId)) {
      savedPostIds.delete(postId);
    } else {
      savedPostIds.add(postId);
    }
    localStorage.setItem(STORAGE_KEYS.SAVED, JSON.stringify([...savedPostIds]));
    updateSavedCountBadge();
    renderPosts();
  }

  function updateSavedCountBadge() {
    if (savedCountBadge) {
      savedCountBadge.textContent = savedPostIds.size.toString();
    }
  }

  function resetAllFilters() {
    currentGenFilter = 'all';
    currentTypeFilter = 'all';
    currentCatFilter = 'all';
    searchQuery = '';
    searchInput.value = '';
    sortSelect.value = 'newest';
    currentSort = 'newest';

    // Reset button states
    document.querySelectorAll('.gen-pill-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.gen === 'all');
    });
    document.querySelectorAll('.filter-chip[data-type]').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.type === 'all');
    });
    document.querySelectorAll('.filter-chip[data-cat]').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.cat === 'all');
    });

    playSparkleSound();
    renderPosts();
  }

  // =========================================================================
  // ARTICLE READER MODAL & COMMENTS
  // =========================================================================
  function openArticle(postId) {
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;

    currentlyOpenPostId = postId;

    modalCoverImg.src = post.coverImage;
    modalCoverImg.alt = post.title;
    modalTitle.textContent = post.title;
    modalAuthorName.textContent = `By ${post.author.name} (${post.author.role})`;
    modalDate.textContent = post.date;
    modalReadTime.textContent = post.readTime;
    modalTrackName.textContent = post.spotlightSong || `${post.title} (Soundtrack)`;

    // Badges
    modalBadges.innerHTML = `
      <span class="tag-pill tag-gen-${post.generation}">${post.generation} Generation</span>
      <span class="tag-pill tag-type-${post.type}">${post.type === 'group' ? 'Group 👥' : 'Soloist 🌟'}</span>
      <span class="tag-pill" style="background:#fee2e2; color:#ef4444;">${post.category}</span>
      ${post.fandomName ? `<span class="tag-pill" style="background:#ede9fe; color:#7c3aed;">Fandom: ${post.fandomName}</span>` : ''}
    `;

    // Article Content
    modalArticleText.innerHTML = post.content;

    // Tags
    modalTagsContainer.innerHTML = (post.tags || []).map(tag => `
      <span class="tag-pill" style="background:var(--pink-soft); color:var(--pink-pop); font-weight:700;">#${tag}</span>
    `).join('');

    // Comments
    renderModalComments(postId);

    // Show modal
    articleModal.classList.add('active');
    articleModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    playSparkleSound();
  }

  function closeArticleModal() {
    articleModal.classList.remove('active');
    articleModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    currentlyOpenPostId = null;
  }

  function renderModalComments(postId) {
    const comments = postComments[postId] || [];
    commentsCountHeader.textContent = `${comments.length} ${comments.length === 1 ? 'comment' : 'comments'}`;

    if (comments.length === 0) {
      modalCommentsList.innerHTML = `
        <div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.9rem;">
          No fan comments yet! Be the first to cheer for your idols! 🌸
        </div>
      `;
      return;
    }

    modalCommentsList.innerHTML = comments.map(c => `
      <div class="comment-item">
        <div class="comment-avatar">${c.author.charAt(0).toUpperCase()}</div>
        <div class="comment-content">
          <h5>${escapeHTML(c.author)} ${c.bias ? `<span style="color:var(--pink-pop); font-size:0.78rem;">(Bias: ${escapeHTML(c.bias)})</span>` : ''}</h5>
          <span>${c.date}</span>
          <p>${escapeHTML(c.text)}</p>
        </div>
      </div>
    `).join('');
  }

  function handleCommentSubmit(e) {
    e.preventDefault();
    if (!currentlyOpenPostId) return;

    const authorInput = document.getElementById('commentAuthorInput');
    const biasInput = document.getElementById('commentBiasInput');
    const textInput = document.getElementById('commentTextInput');

    const author = authorInput.value.trim();
    const bias = biasInput.value.trim();
    const text = textInput.value.trim();

    if (!author || !text) return;

    const newComment = {
      id: 'c_' + Date.now(),
      author: author,
      bias: bias || 'All-Rounder',
      text: text,
      date: 'Just now'
    };

    if (!postComments[currentlyOpenPostId]) {
      postComments[currentlyOpenPostId] = [];
    }

    postComments[currentlyOpenPostId].unshift(newComment);
    localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(postComments));

    renderModalComments(currentlyOpenPostId);
    renderPosts(); // Refresh comment counter on cards
    textInput.value = '';

    playSparkleSound();
  }

  // =========================================================================
  // PHOTOCARD BINDER (COLLECTION & 3D TILT EFFECT)
  // =========================================================================
  function renderPhotocards() {
    if (!photocardGrid) return;

    photocardGrid.innerHTML = PHOTOCARDS.map(card => `
      <div class="photocard-wrapper" data-pc-id="${card.id}">
        <div class="photocard-card">
          <!-- Front Face -->
          <div class="pc-face pc-front" style="border-color:${card.color.includes('gradient') ? '#ffffff' : card.color};">
            <img src="${card.image}" alt="${card.idol} (${card.group})" class="pc-front-img">
            <div class="pc-foil-overlay"></div>
            <div class="pc-front-info">
              <span class="pc-idol-name">${card.idol}</span>
              <span class="pc-idol-group">${card.group} • ${card.gen}</span>
              <span style="font-size:0.7rem; color:var(--text-subtle); margin-top:0.2rem;">${card.flavor}</span>
            </div>
          </div>

          <!-- Back Face -->
          <div class="pc-face pc-back">
            <div class="pc-back-seal">⭐</div>
            <small>${card.rarity}</small>
            <p>"${card.backQuote}"</p>
            <div style="font-size:0.8rem; font-weight:800; color:#ffffff;">${card.idol} • ${card.group}</div>
            <span style="font-size:0.65rem; color:var(--text-subtle); letter-spacing:1px;">OFFICIAL DAEBAK PC</span>
          </div>
        </div>
      </div>
    `).join('');

    // Attach 3D tilt & flip handlers
    document.querySelectorAll('.photocard-wrapper').forEach(wrap => {
      const card = wrap.querySelector('.photocard-card');
      const foil = wrap.querySelector('.pc-foil-overlay');

      wrap.addEventListener('click', () => {
        card.classList.toggle('is-flipped');
        playSparkleSound();
      });

      wrap.addEventListener('mousemove', (e) => {
        const rect = wrap.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -12;
        const rotateY = ((x - centerX) / centerX) * 12;

        if (!card.classList.contains('is-flipped')) {
          card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        }

        if (foil) {
          const percentX = (x / rect.width) * 100;
          const percentY = (y / rect.height) * 100;
          foil.style.background = `radial-gradient(circle at ${percentX}% ${percentY}%, rgba(255,255,255,0.7) 10%, rgba(255,105,180,0.4) 30%, rgba(6,182,212,0.4) 60%, transparent 80%)`;
        }
      });

      wrap.addEventListener('mouseleave', () => {
        if (!card.classList.contains('is-flipped')) {
          card.style.transform = 'rotateX(0deg) rotateY(0deg)';
        }
      });
    });
  }

  // =========================================================================
  // WRITE FAN POST & PUBLISH SYSTEM
  // =========================================================================
  function handleNewPostSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('postTitleInput').value.trim();
    const generation = document.getElementById('postGenSelect').value;
    const type = document.getElementById('postTypeSelect').value;
    const category = document.getElementById('postCategorySelect').value;
    const authorName = document.getElementById('postAuthorInput').value.trim();
    const coverImage = document.getElementById('postImageInput').value.trim() ||
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1000&q=80';
    const summary = document.getElementById('postSummaryInput').value.trim();
    const rawContent = document.getElementById('postContentInput').value.trim();
    const rawTags = document.getElementById('postTagsInput').value.trim();

    if (!title || !authorName || !summary || !rawContent) return;

    const formattedContent = rawContent.split('\n\n').map(p => `<p>${escapeHTML(p)}</p>`).join('');
    const tagsArray = rawTags ? rawTags.split(',').map(t => t.trim()).filter(Boolean) : ['KPop', `${generation} Gen`];

    const newPost = {
      id: 'post-user-' + Date.now(),
      title: title,
      generation: generation,
      type: type,
      category: category,
      author: {
        name: authorName,
        role: "Fan Contributor",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
      },
      date: "Just Now",
      readTime: `${Math.max(2, Math.ceil(rawContent.split(' ').length / 150))} min read`,
      coverImage: coverImage,
      coverAlt: title,
      featured: false,
      likes: 1,
      badge: "Community Post 💖",
      summary: summary,
      content: formattedContent,
      tags: tagsArray,
      fandomName: "K-Pop Stan",
      spotlightSong: title
    };

    // Store in LocalStorage
    const userPosts = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_POSTS) || '[]');
    userPosts.unshift(newPost);
    localStorage.setItem(STORAGE_KEYS.USER_POSTS, JSON.stringify(userPosts));

    // Update in-memory posts array
    allPosts.unshift(newPost);

    // Reset and close
    writePostForm.reset();
    writeModal.classList.remove('active');
    document.body.style.overflow = '';

    playSparkleSound();
    renderPosts();

    // Scroll smoothly to posts
    window.scrollTo({ top: document.querySelector('.controls-card').offsetTop - 90, behavior: 'smooth' });
  }

  // =========================================================================
  // SAVED POSTS (FAN BINDER) MODAL
  // =========================================================================
  function renderSavedList() {
    if (!savedListContainer) return;

    const savedPosts = allPosts.filter(p => savedPostIds.has(p.id));

    if (savedPosts.length === 0) {
      savedListContainer.innerHTML = `
        <div style="text-align:center; padding:3rem 1rem; color:var(--text-muted);">
          <div style="font-size:2.5rem; margin-bottom:0.5rem;">📑</div>
          <h4 style="font-size:1.15rem; font-weight:700; color:var(--text-main);">Your Binder is Empty</h4>
          <p style="font-size:0.85rem; margin-top:0.35rem;">Click the bookmark icon on any post card to save your favorite K-pop features here!</p>
        </div>
      `;
      return;
    }

    savedListContainer.innerHTML = savedPosts.map(p => `
      <div style="display:flex; align-items:center; gap:1rem; padding:1rem; border:1px solid var(--border-subtle); border-radius:var(--radius-md); background:var(--bg-secondary);">
        <img src="${p.coverImage}" alt="${p.title}" style="width:70px; height:70px; border-radius:var(--radius-sm); object-fit:cover; flex-shrink:0;">
        <div style="flex:1;">
          <span style="font-size:0.75rem; font-weight:800; color:var(--pink-pop);">${p.generation} Gen • ${p.category}</span>
          <h4 style="font-size:0.95rem; font-weight:800; cursor:pointer;" class="saved-item-title" data-open-saved="${p.id}">${p.title}</h4>
          <span style="font-size:0.75rem; color:var(--text-muted);">${p.author.name} • ${p.readTime}</span>
        </div>
        <button class="btn-icon" data-remove-saved="${p.id}" title="Remove from Binder" style="width:36px; height:36px;">
          <i class="fa-solid fa-trash-can" style="color:#ef4444; font-size:0.9rem;"></i>
        </button>
      </div>
    `).join('');

    // Attach listeners
    savedListContainer.querySelectorAll('[data-open-saved]').forEach(el => {
      el.addEventListener('click', () => {
        savedModal.classList.remove('active');
        document.body.style.overflow = '';
        openArticle(el.dataset.openSaved);
      });
    });

    savedListContainer.querySelectorAll('[data-remove-saved]').forEach(btn => {
      btn.addEventListener('click', () => {
        savedPostIds.delete(btn.dataset.removeSaved);
        localStorage.setItem(STORAGE_KEYS.SAVED, JSON.stringify([...savedPostIds]));
        updateSavedCountBadge();
        renderSavedList();
        renderPosts();
      });
    });
  }

  // =========================================================================
  // EVENT LISTENERS & SETUP
  // =========================================================================
  function setupEventListeners() {
    // Logo and Nav scroll
    const logoLink = document.getElementById('logoLink');
    if (logoLink) {
      logoLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    document.querySelectorAll('.nav-link-btn[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-link-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.dataset.nav;
        if (target === 'all') {
          window.scrollTo({ top: document.querySelector('.controls-card').offsetTop - 90, behavior: 'smooth' });
        } else if (target === 'timeline') {
          window.scrollTo({ top: document.getElementById('timelineSection').offsetTop - 80, behavior: 'smooth' });
        }
      });
    });

    // Theme toggle
    themeToggleBtn.addEventListener('click', toggleTheme);

    // Generation Timeline Bar Click
    document.querySelectorAll('.gen-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.gen-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentGenFilter = btn.dataset.gen;
        playSparkleSound();
        renderPosts();
      });
    });

    // Type Filter Chips
    document.querySelectorAll('.filter-chip[data-type]').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip[data-type]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentTypeFilter = chip.dataset.type;
        playSparkleSound();
        renderPosts();
      });
    });

    // Category Filter Chips
    document.querySelectorAll('.filter-chip[data-cat]').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip[data-cat]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentCatFilter = chip.dataset.cat;
        playSparkleSound();
        renderPosts();
      });
    });

    // Search bar
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderPosts();
    });

    // Sort select
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderPosts();
    });

    // Reset filters
    resetFiltersBtn.addEventListener('click', resetAllFilters);

    // Lightstick cheer button
    cheerHeartBtn.addEventListener('click', triggerCheer);

    // Spin song wheel
    spinSongBtn.addEventListener('click', spinRecommendation);

    // Article Reader Modal Close
    closeArticleModalBtn.addEventListener('click', closeArticleModal);
    articleModal.addEventListener('click', (e) => {
      if (e.target === articleModal) closeArticleModal();
    });

    // Sound Bite preview inside modal
    playAudioChimeBtn.addEventListener('click', () => {
      playKpopMelodySnippet();
      playAudioChimeBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> Playing Vibe...';
      setTimeout(() => {
        playAudioChimeBtn.innerHTML = '<i class="fa-solid fa-play"></i> Play Sound Bite';
      }, 1000);
    });

    // Comment form
    commentForm.addEventListener('submit', handleCommentSubmit);

    // Photocard Binder Modal
    openPhotocardBtn.addEventListener('click', () => {
      photocardModal.classList.add('active');
      photocardModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      playSparkleSound();
    });
    closePhotocardModalBtn.addEventListener('click', () => {
      photocardModal.classList.remove('active');
      photocardModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    });
    photocardModal.addEventListener('click', (e) => {
      if (e.target === photocardModal) {
        photocardModal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });

    // Scroll to Lightstick Lounge from navbar
    openCheerWidgetBtn.addEventListener('click', () => {
      const sidebar = document.querySelector('.hero-interactive-sidebar');
      if (sidebar) {
        sidebar.scrollIntoView({ behavior: 'smooth' });
        triggerCheer();
      }
    });

    // Write Post Modal
    openWriteModalBtn.addEventListener('click', () => {
      writeModal.classList.add('active');
      writeModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    });
    closeWriteModalBtn.addEventListener('click', () => {
      writeModal.classList.remove('active');
      writeModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    });
    writeModal.addEventListener('click', (e) => {
      if (e.target === writeModal) {
        writeModal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
    writePostForm.addEventListener('submit', handleNewPostSubmit);

    // Saved Bookmarks Drawer
    savedPostsBtn.addEventListener('click', () => {
      renderSavedList();
      savedModal.classList.add('active');
      savedModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      playSparkleSound();
    });
    closeSavedModalBtn.addEventListener('click', () => {
      savedModal.classList.remove('active');
      savedModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    });
    savedModal.addEventListener('click', (e) => {
      if (e.target === savedModal) {
        savedModal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });

    // Keyboard ESC to close any open modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeArticleModal();
        photocardModal.classList.remove('active');
        writeModal.classList.remove('active');
        savedModal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });

    // Footer generation filter links
    document.querySelectorAll('[data-footer-gen]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const gen = link.dataset.footerGen;
        const targetBtn = document.querySelector(`.gen-pill-btn[data-gen="${gen}"]`);
        if (targetBtn) targetBtn.click();
        window.scrollTo({ top: document.getElementById('timelineSection').offsetTop - 80, behavior: 'smooth' });
      });
    });

    // Footer category filter links
    document.querySelectorAll('[data-footer-cat]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const cat = link.dataset.footerCat;
        const targetChip = document.querySelector(`.filter-chip[data-cat="${cat}"]`);
        if (targetChip) targetChip.click();
        window.scrollTo({ top: document.querySelector('.controls-card').offsetTop - 80, behavior: 'smooth' });
      });
    });
  }

  // Utility to escape HTML and prevent XSS in fan comments
  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
