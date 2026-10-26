import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import {
  Home,
  UtensilsCrossed,
  Gift,
  Wallet,
  UserRound,
  LayoutDashboard,
  Users,
  Tag,
  MessageCircle,
  ChartNoAxesCombined,
  Settings,
  Menu as MenuIcon,
  Search,
  Bell,
  ArrowRight,
  Plus,
  Minus,
  Check,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Edit3,
  RotateCcw,
  Coins,
  TrendingUp,
  Clock,
  TicketPercent,
  Send,
  CheckCircle2,
  X,
  ShieldCheck,
  Sparkles,
  Calendar,
  Heart,
  Phone,
  LogOut,
  Receipt,
  Star,
  SlidersHorizontal,
  Instagram,
  ExternalLink,
  ShoppingBag,
  Eye,
  Download,
  AlertTriangle,
  BarChart3,
  Copy,
  Share2,
  MessageSquare,
  Link2,
  UserPlus,
  MapPin,
  Navigation,
  ThumbsUp,
} from "lucide-react";
import {
  makeInitial,
  money,
  dateFmt,
  customerStats,
  inactiveDays,
  newId,
  generateReferralCode,
} from "./data";

const STORAGE = "fruzo-demo-mvp-v1";
// Pending referral attribution: stored in sessionStorage when a ?ref= URL is opened.
const PENDING_REF_KEY = "fruzo-pending-ref";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return makeInitial();
    const value = JSON.parse(raw);
    if (!value || value.version !== 1 || !value.customers?.length || !value.menus?.length)
      return makeInitial();
    // --- Safe forward migration for referral feature ---
    if (!Array.isArray(value.referrals)) value.referrals = [];
    if (!Array.isArray(value.feedbacks)) value.feedbacks = [];
    if (!value.restaurant.googleReviewUrl && value.restaurant.googleReviewUrl !== "") {
      value.restaurant.googleReviewUrl = "";
    }
    if (!value.restaurant.googleMapsUrl && value.restaurant.googleMapsUrl !== "") {
      value.restaurant.googleMapsUrl = "";
    }
    value.customers = value.customers.map((c) => ({
      referralCode: generateReferralCode(c.id),
      referredBy: null,
      ...c, // existing fields win, so saved referredBy is preserved
    }));
    return value;
  } catch {
    return makeInitial();
  }
}

const customerNav = [
  ["home", "Home", Home],
  ["menu", "Menu", UtensilsCrossed],
  ["rewards", "Rewards", Gift],
  ["wallet", "Points", Wallet],
  ["profile", "Profile", UserRound],
];

const adminNav = [
  ["dashboard", "Overview", LayoutDashboard],
  ["customers", "Customers", Users],
  ["purchase", "Record Purchase", Receipt],
  ["menu", "Menu Items", UtensilsCrossed],
  ["rewards", "Rewards", Gift],
  ["offers", "Offers & Campaigns", Tag],
  ["messages", "Messages", MessageCircle],
  ["settings", "Settings", Settings],
];

function App() {
  const [db, setDb] = useState(load);
  const [view, setView] = useState("customer");
  const [page, setPage] = useState("home");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [editing, setEditing] = useState(null);
  const [customerFilter, setCustomerFilter] = useState("All");
  const [range, setRange] = useState("All time");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(db));
    } catch {
      console.warn("Storage full");
    }
  }, [db]);

  // Read ?ref=CODE from URL on first mount and store pending referral attribution.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    if (!refCode) return;
    const referrer = db.customers.find(
      (c) => (c.referralCode || "").toUpperCase() === refCode.toUpperCase()
    );
    if (!referrer) return; // unknown code - ignore
    const existing = sessionStorage.getItem(PENDING_REF_KEY);
    if (!existing) {
      sessionStorage.setItem(PENDING_REF_KEY, referrer.id);
    }
    // Remove ?ref= from the URL bar without a page reload
    const clean = new URL(window.location.href);
    clean.searchParams.delete("ref");
    window.history.replaceState({}, "", clean.toString());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  function modify(fn) {
    setDb((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }

  function notify(msg) {
    setToast(msg);
  }

  function navigate(id) {
    setPage(id);
    setModal(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const active =
    db.customers.find((c) => c.id === db.activeCustomer) || db.customers[0];
  const stats = customerStats(db, active.id);

  function purchase(customerId, amount) {
    const a = Number(amount);
    if (!Number.isFinite(a) || a <= 0) {
      notify("Enter a valid bill amount");
      return false;
    }
    const d = new Date().toISOString(),
      id = newId();
    const base = Math.floor(a / Number(db.restaurant.earnRate || 10));
    modify((s) => {
      s.purchases.unshift({
        id,
        customerId,
        amount: a,
        date: d,
        source: "staff",
      });
      s.points.unshift({
        id: newId(),
        customerId,
        amount: base,
        type: "earn",
        date: d,
        detail: "Points from purchase",
        purchaseId: id,
      });
      s.messages.unshift({
        id: newId(),
        customerId,
        date: d,
        type: "points",
        text: `Thanks for visiting Fruzo! You earned ${base} points on your ${money(a)} purchase.`,
        status: "Demo notification",
      });
      // --- Referral reward (atomic, same state update) ---
      const REFERRAL_BONUS = 100;
      const referredCustomer = s.customers.find((c) => c.id === customerId);
      const referrerId = referredCustomer?.referredBy || null;
      if (referrerId && referrerId !== customerId) {
        const existingReferral = (s.referrals || []).find(
          (r) => r.referredCustomerId === customerId
        );
        if (existingReferral && existingReferral.status === "pending") {
          // Count previous purchases (excluding this new one) to confirm first purchase.
          const previousPurchases = s.purchases.filter(
            (p) => p.customerId === customerId && p.id !== id
          );
          if (previousPurchases.length === 0) {
            existingReferral.status = "rewarded";
            existingReferral.qualifyingPurchaseId = id;
            existingReferral.rewardedAt = d;
            s.points.unshift({
              id: newId(),
              customerId: referrerId,
              amount: REFERRAL_BONUS,
              type: "referral",
              date: d,
              detail: "Referral bonus - friend joined Fruzo",
              referralId: existingReferral.id,
            });
            s.messages.unshift({
              id: newId(),
              customerId: referrerId,
              date: d,
              type: "referral",
              text:
                "Great news! Someone you referred just made their first purchase at Fruzo. " +
                "You earned " + REFERRAL_BONUS + " bonus points - thank you for spreading the word!",
              status: "Demo notification",
            });
          }
        }
      }
    });
    notify(`${base} points credited successfully!`);
    return true;
  }

  function redeem(reward) {
    if (stats.points < reward.points) {
      notify("You need more points to claim this reward");
      return;
    }
    if (!reward.active) {
      notify("This reward is not currently available");
      return;
    }
    modify((s) => {
      const d = new Date().toISOString();
      s.points.unshift({
        id: newId(),
        customerId: active.id,
        amount: -reward.points,
        type: "redeem",
        date: d,
        detail: `Redeemed ${reward.name}`,
      });
      s.redemptions.unshift({
        id: newId(),
        customerId: active.id,
        rewardId: reward.id,
        name: reward.name,
        points: reward.points,
        date: d,
        status: "redeemed",
      });
      s.messages.unshift({
        id: newId(),
        customerId: active.id,
        date: d,
        type: "reward",
        text: `Yay! You've redeemed ${reward.name} for ${reward.points} points. Show this confirmation to our staff.`,
        status: "Demo notification",
      });
    });
    setModal(null);
    notify(`🎉 ${reward.name} redeemed!`);
  }

  function sendOffer(customerId, offerId) {
    const o = db.offers.find((x) => x.id === offerId) || db.offers[0];
    if (!o) {
      notify("Create an offer first");
      return;
    }
    const c = db.customers.find((x) => x.id === customerId);
    if (!c?.consent) {
      notify("This customer has not opted in to marketing");
      return;
    }
    modify((s) => {
      s.coupons.unshift({
        id: newId(),
        customerId,
        offerId: o.id,
        code: `FRUZO${String(Math.floor(Math.random() * 9000) + 1000)}`,
        status: "active",
        created: new Date().toISOString(),
      });
      s.messages.unshift({
        id: newId(),
        customerId,
        date: new Date().toISOString(),
        type: "offer",
        text: `Hi ${c.name.split(" ")[0]}! We miss you at Fruzo 💛 ${o.title} — ${o.description} Show your offer at the counter.`,
        status: "Simulated — not sent",
      });
    });
    notify(`Comeback offer simulated for ${c.name}`);
  }

  const totalSpend = db.purchases.reduce((a, p) => a + p.amount, 0);
  const repeat = db.customers.filter(
    (c) => customerStats(db, c.id).visits >= 2,
  ).length;
  const inactive = db.customers.filter(
    (c) => inactiveDays(customerStats(db, c.id).last) >= 30,
  );
  const earned = db.points
    .filter((p) => p.amount > 0)
    .reduce((a, p) => a + p.amount, 0);
  const redeemed = db.points
    .filter((p) => p.amount < 0)
    .reduce((a, p) => a - p.amount, 0);

  function reset() {
    if (
      window.confirm(
        "Reset every demo change and restore the original Fruzo dataset?",
      )
    ) {
      setDb(makeInitial());
      navigate(view === "admin" ? "dashboard" : "home");
      notify("Demo data restored");
    }
  }

  return (
    <div className={`app ${view}`}>
      {view === "admin" && (
        <aside className="sidebar">
          <Brand />
          <div className="side-caption">WORKSPACE</div>
          <div className="side-links">
            {adminNav.map(([id, name, I]) => (
              <button
                key={id}
                className={"side-link " + (page === id ? "selected" : "")}
                onClick={() => navigate(id)}
              >
                <I size={18} />
                {name}
              </button>
            ))}
          </div>
          <div className="sidebar-bottom">
            <div className="side-admin">
              🟡{" "}
              <span>
                <strong>Fruzo Business</strong>
                <small>Presentation mode</small>
              </span>
            </div>
            <button
              className="small-text-link"
              onClick={() => {
                setView("customer");
                navigate("home");
              }}
            >
              View customer app <ArrowRight size={15} />
            </button>
          </div>
        </aside>
      )}
      <div className="app-main">
        {view === "customer" ? (
          <>
            <header className="customer-header">
              <div className="header-inner">
                <Brand compact />
                <nav className="desktop-nav">
                  {customerNav.map(([id, name]) => (
                    <button
                      key={id}
                      className={page === id ? "active" : ""}
                      onClick={() => navigate(id)}
                    >
                      {name}
                    </button>
                  ))}
                </nav>
                <div className="header-tools">
                  <button
                    className="icon-button"
                    aria-label="Notifications"
                    onClick={() => navigate("notifications")}
                  >
                    <Bell size={20} />
                    {db.messages.some((m) => m.customerId === active.id) && (
                      <i className="notice-dot" />
                    )}
                  </button>
                  <button
                    className="avatar"
                    onClick={() => navigate("profile")}
                  >
                    {active.name.slice(0, 1)}
                  </button>
                </div>
              </div>
            </header>
            <main className="customer-content">
              {page === "home" && (
                <>
                  <section className="home-welcome">
                    <div>
                      <span className="eyebrow">
                        GOOD VIBES, {active.name.split(" ")[0].toUpperCase()} 👋
                      </span>
                      <h1>
                        Craving something <em>fresh?</em>
                      </h1>
                      <p>
                        Fresh blends, tasty bites and little rewards with every
                        visit.
                      </p>
                    </div>
                    <button
                      className="compact-wallet"
                      onClick={() => navigate("wallet")}
                    >
                      <span className="wallet-icon">
                        <Coins size={22} />
                      </span>
                      <span>
                        <small>YOUR POINTS</small>
                        <strong>{stats.points.toLocaleString("en-IN")}</strong>
                      </span>
                      <ChevronRight size={18} />
                    </button>
                  </section>
                  <HomePromoCarousel
                    db={db}
                    active={active}
                    modify={modify}
                    notify={notify}
                    setModal={setModal}
                  />
                  <section className="hero">
                    <div className="hero-copy">
                      <span className="hero-pill">
                        <Sparkles size={14} /> MADE WITH HAPPINESS
                      </span>
                      <h2>
                        Fresh flavours.
                        <br />
                        Happier <i>you.</i>
                      </h2>
                      <p>
                        Your next favourite sip is waiting. Explore Fruzo's
                        most-loved refreshers.
                      </p>
                      <button
                        className="button button-dark"
                        onClick={() => navigate("menu")}
                      >
                        Explore the menu <ArrowRight size={18} />
                      </button>
                    </div>
                    <div className="hero-art">
                      <span className="hero-fruit one">🥭</span>
                      <span className="hero-drink">🥤</span>
                      <span className="hero-fruit two">🍓</span>
                      <span className="hero-deco">✺</span>
                    </div>
                  </section>
                  <div className="search-home" onClick={() => navigate("menu")}>
                    <Search size={20} />
                    <span>What are you craving today?</span>
                    <span className="search-hint">
                      Search menu <ArrowRight size={15} />
                    </span>
                  </div>
                  <SectionHeading
                    label="EXPLORE FRUZO"
                    title="Something for every craving"
                  />
                  <div className="category-row">
                    {[
                      ["All", "✨"],
                      ["Juices", "🥭"],
                      ["Shakes", "🥤"],
                      ["Mocktails", "🍹"],
                      ["Snacks", "🍟"],
                    ].map(([cat, emoji]) => (
                      <button
                        className="cat-tile"
                        key={cat}
                        onClick={() => {
                          setCategory(cat);
                          navigate("menu");
                        }}
                      >
                        <span>{emoji}</span>
                        <strong>{cat === "All" ? "All items" : cat}</strong>
                      </button>
                    ))}
                  </div>
                  <div className="split-heading">
                    <SectionHeading
                      label="THE FAN FAVOURITES"
                      title="Popular at Fruzo"
                    />
                    <button
                      className="text-link"
                      onClick={() => navigate("menu")}
                    >
                      See full menu <ArrowRight size={17} />
                    </button>
                  </div>
                  <div className="products-grid featured">
                    {db.menus
                      .filter((m) => m.trending && m.available)
                      .slice(0, 4)
                      .map((m) => (
                        <FoodCard
                          key={m.id}
                          item={m}
                          onClick={() => setModal({ type: "product", item: m })}
                        />
                      ))}
                  </div>
                  <section className="yellow-promo">
                    <div>
                      <span className="eyebrow">THE FRUZO CLUB</span>
                      <h2>
                        Every sip
                        <br />
                        brings a little <em>more.</em>
                      </h2>
                      <p>
                        Collect points, unlock tasty treats, and keep the good
                        times flowing.
                      </p>
                      <button
                        className="button button-dark"
                        onClick={() => navigate("rewards")}
                      >
                        See my rewards <ArrowRight size={17} />
                      </button>
                    </div>
                    <span className="promo-icon">🎁</span>
                  </section>
                  <div className="split-heading">
                    <SectionHeading
                      label="JUST FOR YOU"
                      title="Happiness on offer"
                    />
                    <button
                      className="text-link"
                      onClick={() => navigate("offers")}
                    >
                      All offers <ArrowRight size={17} />
                    </button>
                  </div>
                  <div className="offers-grid">
                    {db.offers
                      .filter((o) => o.active)
                      .slice(0, 3)
                      .map((o) => (
                        <OfferCard
                          key={o.id}
                          offer={o}
                          onClick={() => navigate("offers")}
                        />
                      ))}
                  </div>
                </>
              )}
              {page === "menu" && (
                <>
                  <PageIntro
                    eyebrow="CRAFTED WITH LOVE"
                    title="The Fruzo menu"
                    description="Discover refreshing drinks, tasty bites and your next favourite."
                  />
                  <div className="menu-toolbar">
                    <div className="search-box">
                      <Search size={19} />
                      <input
                        placeholder="Search drinks, snacks, favourites..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                      {query && (
                        <button onClick={() => setQuery("")}>
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    <span className="item-count">
                      {
                        db.menus.filter(
                          (m) =>
                            (category === "All" || m.category === category) &&
                            `${m.name} ${m.description}`
                              .toLowerCase()
                              .includes(query.toLowerCase()),
                        ).length
                      }{" "}
                      items
                    </span>
                  </div>
                  <div className="chips">
                    {["All", "Juices", "Shakes", "Mocktails", "Snacks"].map(
                      (c) => (
                        <button
                          key={c}
                          className={"chip " + (category === c ? "chosen" : "")}
                          onClick={() => setCategory(c)}
                        >
                          {c}
                        </button>
                      ),
                    )}
                  </div>
                  <div className="products-grid">
                    {db.menus
                      .filter(
                        (m) =>
                          (category === "All" || m.category === category) &&
                          `${m.name} ${m.description}`
                            .toLowerCase()
                            .includes(query.toLowerCase()),
                      )
                      .map((m) => (
                        <FoodCard
                          key={m.id}
                          item={m}
                          onClick={() => setModal({ type: "product", item: m })}
                        />
                      ))}{" "}
                  </div>
                  {!db.menus.some(
                    (m) =>
                      (category === "All" || m.category === category) &&
                      `${m.name} ${m.description}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                  ) && (
                    <EmptyState
                      icon={Search}
                      title="Nothing found"
                      subtitle="Try a different search or category."
                    />
                  )}
                </>
              )}
              {page === "rewards" && (
                <>
                  <PageIntro
                    eyebrow="GOOD THINGS ADD UP"
                    title="The rewards club"
                    description="Every visit gets you closer to something delicious."
                  />
                  <section className="rewards-hero">
                    <span className="sparkle-float">✨</span>
                    <div>
                      <span className="eyebrow">YOUR AVAILABLE POINTS</span>
                      <div className="mega-points">
                        <Coins size={34} />
                        {stats.points.toLocaleString("en-IN")}
                      </div>
                      <p>
                        Keep collecting. Your next treat is just around the
                        corner.
                      </p>
                    </div>
                    <div className="big-gift">🎁</div>
                  </section>
                  <div className="split-heading">
                    <SectionHeading
                      label="PICK YOUR TREAT"
                      title="Rewards to love"
                    />
                    <span className="muted">
                      {db.rewards.filter((r) => r.active).length} rewards
                      available
                    </span>
                  </div>
                  <div className="reward-grid">
                    {db.rewards
                      .filter((r) => r.active)
                      .map((r) => (
                        <div className="reward-card" key={r.id}>
                          <div className="reward-emoji">{r.emoji}</div>
                          <div className="reward-body">
                            <strong>{r.name}</strong>
                            <p>{r.description}</p>
                            <span className="points-label">
                              <Coins size={15} /> {r.points} points
                            </span>
                            {stats.points < r.points ? (
                              <>
                                <div className="progress">
                                  <span
                                    style={{
                                      width: `${Math.min(100, (stats.points / r.points) * 100)}%`,
                                    }}
                                  />
                                </div>
                                <small>
                                  {r.points - stats.points} points to go
                                </small>
                              </>
                            ) : (
                              <span className="ready-note">
                                <CheckCircle2 size={14} /> Ready to redeem
                              </span>
                            )}
                            <button
                              className="button button-yellow full"
                              disabled={stats.points < r.points}
                              onClick={() =>
                                setModal({ type: "redeem", item: r })
                              }
                            >
                              {stats.points >= r.points
                                ? "Redeem now"
                                : "Keep collecting"}{" "}
                              <ArrowRight size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              )}
              {page === "wallet" && (
                <>
                  <PageIntro
                    eyebrow="YOUR LOYALTY JOURNEY"
                    title="My points wallet"
                    description="Little rewards for all your favourite Fruzo moments."
                  />
                  <section className="wallet-hero">
                    <span>FRUZO REWARDS CLUB</span>
                    <div className="wallet-large-value">
                      <Coins size={32} />
                      <strong>{stats.points.toLocaleString("en-IN")}</strong>
                    </div>
                    <p>Available points</p>
                    <div className="wallet-footer">
                      <span>Member: {active.name}</span>
                      <span>Every ₹{db.restaurant.earnRate} = 1 point</span>
                    </div>
                  </section>
                  <div className="two-mini-stats">
                    <div>
                      <span>Visits recorded</span>
                      <strong>{stats.visits}</strong>
                    </div>
                    <div>
                      <span>Total tracked spend</span>
                      <strong>{money(stats.spent)}</strong>
                    </div>
                  </div>
                  <div className="split-heading">
                    <SectionHeading
                      label="YOUR ACTIVITY"
                      title="Points history"
                    />
                    <button
                      className="text-link"
                      onClick={() => navigate("rewards")}
                    >
                      Redeem points <ArrowRight size={15} />
                    </button>
                  </div>
                  <div className="transaction-list">
                    {db.points
                      .filter((t) => t.customerId === active.id)
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .slice(0, 20)
                      .map((t) => (
                        <div className="transaction" key={t.id}>
                          <span
                            className={
                              "transaction-icon " +
                              (t.amount < 0 ? "spent" : "")
                            }
                          >
                            <Coins size={19} />
                          </span>
                          <span className="grow">
                            <strong>{t.detail}</strong>
                            <small>{dateFmt(t.date)}</small>
                          </span>
                          <strong
                            className={t.amount > 0 ? "positive" : "negative"}
                          >
                            {t.amount > 0 ? "+" : ""}
                            {t.amount} pts
                          </strong>
                        </div>
                      ))}
                  </div>
                </>
              )}
              {page === "profile" && (
                <>
                  <PageIntro
                    eyebrow="HELLO, FRIEND"
                    title="My Fruzo profile"
                    description="Your very own corner of happiness."
                  />
                  <div className="profile-top">
                    <span className="profile-avatar">
                      {active.name.slice(0, 1)}
                    </span>
                    <div>
                      <h2>{active.name}</h2>
                      <p>
                        <Phone size={15} />
                        {active.phone}
                      </p>
                      <span className="member-tag">
                        <Star size={13} /> FRUZO CLUB MEMBER
                      </span>
                    </div>
                  </div>
                  <div className="profile-stats">
                    <div>
                      <strong>{stats.points}</strong>
                      <span>Points</span>
                    </div>
                    <div>
                      <strong>{stats.visits}</strong>
                      <span>Visits</span>
                    </div>
                    <div>
                      <strong>{money(stats.spent)}</strong>
                      <span>Spent</span>
                    </div>
                  </div>
                  <div className="profile-links">
                    <button onClick={() => navigate("wallet")}>
                      <Wallet size={20} /> Points & transaction history{" "}
                      <ChevronRight size={18} />
                    </button>
                    <button onClick={() => navigate("rewards")}>
                      <Gift size={20} /> Available rewards{" "}
                      <ChevronRight size={18} />
                    </button>
                    <button onClick={() => navigate("offers")}>
                      <Tag size={20} /> Offers & coupons{" "}
                      <ChevronRight size={18} />
                    </button>
                    <button onClick={() => navigate("notifications")}>
                      <Bell size={20} /> My notifications{" "}
                      <ChevronRight size={18} />
                    </button>
                  </div>
                  <div className="selector-card">
                    <label>SWITCH DEMO CUSTOMER</label>
                    <select
                      value={active.id}
                      onChange={(e) =>
                        modify((s) => {
                          s.activeCustomer = e.target.value;
                        })
                      }
                    >
                      {db.customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <p>
                      For presentation purposes: switch between sample customers
                      and see their real demo balances.
                    </p>
                  </div>
                  <ReferralSection
                    db={db}
                    active={active}
                    modify={modify}
                    notify={notify}
                  />
                </>
              )}
              {page === "offers" && (
                <>
                  <PageIntro
                    eyebrow="A LITTLE EXTRA LOVE"
                    title="Offers for you"
                    description="Sweet surprises to make your Fruzo visits even better."
                  />
                  <div className="offers-grid offer-page">
                    {db.offers
                      .filter((o) => o.active)
                      .map((o) => (
                        <OfferCard
                          key={o.id}
                          offer={o}
                          onClick={() => setModal({ type: "offer", item: o })}
                        />
                      ))}
                  </div>
                  {!db.offers.some((o) => o.active) && (
                    <EmptyState
                      icon={Tag}
                      title="No active offers"
                      subtitle="New Fruzo treats are coming soon."
                    />
                  )}
                  <div className="section-gap" />
                  <SectionHeading
                    label="YOUR PERSONAL OFFERS"
                    title="Comeback coupons"
                  />
                  <div className="transaction-list">
                    {db.coupons.filter((c) => c.customerId === active.id)
                      .length === 0 ? (
                      <EmptyState
                        icon={TicketPercent}
                        title="Nothing here yet"
                        subtitle="Special coupons sent by Fruzo will appear here."
                      />
                    ) : (
                      db.coupons
                        .filter((c) => c.customerId === active.id)
                        .map((c) => (
                          <div className="transaction" key={c.id}>
                            <span className="transaction-icon">🎟️</span>
                            <span className="grow">
                              <strong>
                                {db.offers.find((o) => o.id === c.offerId)
                                  ?.title || "Special offer"}
                              </strong>
                              <small>
                                Code: {c.code} · {c.status}
                              </small>
                            </span>
                            <button
                              className="outline-mini"
                              onClick={() => {
                                navigator.clipboard?.writeText(c.code);
                                notify("Coupon code copied");
                              }}
                            >
                              <Copy size={15} /> Copy
                            </button>
                          </div>
                        ))
                    )}
                  </div>
                </>
              )}
              {page === "notifications" && (
                <>
                  <PageIntro
                    eyebrow="STAY IN THE LOOP"
                    title="Your notifications"
                    description="Updates from your Fruzo loyalty journey."
                  />
                  <div className="transaction-list">
                    {db.messages.filter((m) => m.customerId === active.id)
                      .length ? (
                      db.messages
                        .filter((m) => m.customerId === active.id)
                        .map((m) => (
                          <div className="transaction" key={m.id}>
                            <span className="transaction-icon">
                              <Bell size={18} />
                            </span>
                            <span className="grow">
                              <strong>
                                {m.type === "points"
                                  ? "Points earned"
                                  : m.type === "reward"
                                    ? "Reward redeemed"
                                    : m.type === "referral"
                                      ? "Referral bonus"
                                      : m.type === "feedback"
                                        ? "Feedback bonus"
                                        : "Fruzo special offer"}
                              </strong>
                              <small className="notification-detail">
                                {m.text}
                              </small>
                              <small>
                                {dateFmt(m.date)} · {m.status}
                              </small>
                            </span>
                          </div>
                        ))
                    ) : (
                      <EmptyState
                        icon={Bell}
                        title="All caught up!"
                        subtitle="Fruzo updates will appear here."
                      />
                    )}
                  </div>
                </>
              )}
            </main>
            <footer className="customer-footer">
              <div>
                <Brand compact />
                <p>
                  We blend happiness. Fresh flavours, cheerful moments, and
                  little rewards for every visit.
                </p>
              </div>
              <div>
                <strong>Explore</strong>
                <button onClick={() => navigate("menu")}>Our menu</button>
                <button onClick={() => navigate("rewards")}>
                  Loyalty rewards
                </button>
                <button onClick={() => navigate("offers")}>
                  Latest offers
                </button>
              </div>
              <div>
                <strong>Made with 💛</strong>
                <small>Fruzo loyalty experience · MVP demonstration</small>
                <small>No real purchases or messages are sent.</small>
              </div>
            </footer>
            <nav className="bottom-nav">
              {customerNav.map(([id, name, I]) => (
                <button
                  key={id}
                  className={page === id ? "active" : ""}
                  onClick={() => navigate(id)}
                >
                  <I size={21} strokeWidth={page === id ? 2.6 : 1.9} />
                  <span>{name}</span>
                </button>
              ))}
            </nav>
          </>
        ) : (
          <>
            <header className="admin-header">
              <div>
                <span className="admin-eyebrow">FRUZO / BUSINESS CENTER</span>
                <strong>
                  {adminNav.find((n) => n[0] === page)?.[1] || "Overview"}
                </strong>
              </div>
              <div className="admin-head-actions">
                <span className="demo-badge">
                  <span /> LIVE DEMO
                </span>
                <button
                  className="icon-button"
                  aria-label="Customer view"
                  title="Open customer view"
                  onClick={() => {
                    setView("customer");
                    navigate("home");
                  }}
                >
                  <Eye size={19} />
                </button>
                <span className="admin-avatar">F</span>
              </div>
            </header>
            <main className="admin-content">
              {page === "dashboard" && (
                <>
                  <div className="admin-title-row">
                    <div>
                      <span className="eyebrow">
                        YOUR RESTAURANT, AT A GLANCE
                      </span>
                      <h1>
                        Good{" "}
                        {new Date().getHours() < 12
                          ? "morning"
                          : new Date().getHours() < 17
                            ? "afternoon"
                            : "evening"}
                        , Fruzo 👋
                      </h1>
                      <p>Here's how your loyalty club is doing.</p>
                    </div>
                    <button
                      className="button button-yellow"
                      onClick={() => navigate("purchase")}
                    >
                      <Plus size={17} /> Record a purchase
                    </button>
                  </div>
                  <div className="metrics-grid">
                    <Metric
                      icon={Users}
                      label="Club members"
                      value={db.customers.length}
                      detail="Registered customers"
                    />
                    <Metric
                      icon={TrendingUp}
                      label="Repeat customers"
                      value={`${db.customers.length ? Math.round((repeat / db.customers.length) * 100) : 0}%`}
                      detail={`${repeat} customers returned`}
                    />
                    <Metric
                      icon={Wallet}
                      label="Tracked spending"
                      value={money(totalSpend)}
                      detail="Across recorded purchases"
                    />
                    <Metric
                      icon={Clock}
                      label="Inactive 30+ days"
                      value={inactive.length}
                      detail="Comeback opportunities"
                    />
                  </div>
                  <div className="admin-chart-row">
                    <div className="panel chart-panel">
                      <PanelHead
                        title="Customer activity"
                        subtitle="Recorded visits over the last 6 weeks"
                      />
                      <VisitBars purchases={db.purchases} />
                    </div>
                    <div className="panel insight-panel">
                      <PanelHead
                        title="Comeback opportunities"
                        subtitle="Customers who may need a nudge"
                      />
                      <div className="insight-number">
                        {inactive.length}
                        <span> customers</span>
                      </div>
                      <div className="insight-strips">
                        {[15, 30, 45].map((d) => (
                          <div key={d}>
                            <span>Inactive {d}+ days</span>
                            <strong>
                              {
                                db.customers.filter(
                                  (c) =>
                                    inactiveDays(
                                      customerStats(db, c.id).last,
                                    ) >= d,
                                ).length
                              }
                            </strong>
                          </div>
                        ))}
                      </div>
                      <button
                        className="button button-yellow full"
                        onClick={() => {
                          setCustomerFilter("Inactive");
                          navigate("customers");
                        }}
                      >
                        Reconnect with customers <ArrowRight size={17} />
                      </button>
                    </div>
                  </div>
                  <div className="admin-lower-grid">
                    <div className="panel">
                      <PanelHead
                        title="Recent purchases"
                        subtitle="Latest loyalty activity"
                        right={
                          <button
                            className="small-text-link"
                            onClick={() => navigate("purchase")}
                          >
                            Record new <ArrowRight size={14} />
                          </button>
                        }
                      />
                      <div className="activity-list">
                        {db.purchases
                          .slice()
                          .sort((a, b) => b.date.localeCompare(a.date))
                          .slice(0, 5)
                          .map((p) => (
                            <div className="activity" key={p.id}>
                              <span className="activity-icon">🧾</span>
                              <span className="grow">
                                <strong>
                                  {
                                    db.customers.find(
                                      (c) => c.id === p.customerId,
                                    )?.name
                                  }
                                </strong>
                                <small>
                                  {dateFmt(p.date)} ·{" "}
                                  {Math.floor(
                                    p.amount / db.restaurant.earnRate,
                                  )}{" "}
                                  points earned
                                </small>
                              </span>
                              <strong>{money(p.amount)}</strong>
                            </div>
                          ))}
                      </div>
                    </div>
                    <div className="panel">
                      <PanelHead
                        title="Quick actions"
                        subtitle="Everything you need, one click away"
                      />
                      <div className="action-grid">
                        {[
                          [Receipt, "Record bill", "purchase"],
                          [Users, "Customers", "customers"],
                          [Gift, "Manage rewards", "rewards"],
                          [Tag, "Create offer", "offers"],
                          [UtensilsCrossed, "Edit menu", "menu"],
                          [MessageCircle, "Messages", "messages"],
                        ].map(([I, text, id]) => (
                          <button
                            className="action-card"
                            key={id}
                            onClick={() => navigate(id)}
                          >
                            <I size={19} />
                            {text}
                            <ArrowRight size={15} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="admin-lower-grid">
                    <div className="panel">
                      <PanelHead
                        title="Referral programme"
                        subtitle="Customer-to-customer referral tracking"
                      />
                      <div className="metrics-grid compact-metrics">
                        <Metric
                          icon={UserPlus}
                          label="Total referrals"
                          value={(db.referrals || []).length}
                          detail="Invitations tracked"
                        />
                        <Metric
                          icon={CheckCircle2}
                          label="Successful"
                          value={(db.referrals || []).filter(r => r.status === "rewarded").length}
                          detail="Rewards credited"
                        />
                        <Metric
                          icon={Coins}
                          label="Points issued"
                          value={`${(db.referrals || []).filter(r => r.status === "rewarded").length * 100}`}
                          detail="Referral bonus points"
                        />
                      </div>
                      {(db.referrals || []).length > 0 && (
                        <div className="activity-list" style={{ marginTop: 14 }}>
                          {(db.referrals || []).slice(0, 8).map((r) => {
                            const referrer = db.customers.find(c => c.id === r.referrerCustomerId);
                            const referred = db.customers.find(c => c.id === r.referredCustomerId);
                            return (
                              <div className="activity" key={r.id}>
                                <span className="activity-icon">{r.status === "rewarded" ? "✅" : "⏳"}</span>
                                <span className="grow">
                                  <strong>{referrer?.name || "Unknown"} → {referred?.name || "Unknown"}</strong>
                                  <small>
                                    {r.status === "rewarded"
                                      ? `Rewarded ${dateFmt(r.rewardedAt)} · +100 pts`
                                      : `Pending · Created ${dateFmt(r.createdAt)}`}
                                  </small>
                                </span>
                                <span className={"status " + (r.status === "rewarded" ? "good" : "")}>
                                  {r.status === "rewarded" ? "Rewarded" : "Pending"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {(db.referrals || []).length === 0 && (
                        <EmptyState
                          icon={UserPlus}
                          title="No referrals yet"
                          subtitle="Customers can invite friends from their profile or homepage carousel."
                        />
                      )}
                    </div>
                    <div className="panel">
                      <PanelHead
                        title="Private feedback"
                        subtitle="Direct customer feedback submissions"
                      />
                      <div className="metrics-grid compact-metrics">
                        <Metric
                          icon={MessageSquare}
                          label="Submissions"
                          value={(db.feedbacks || []).length}
                          detail="Total feedback received"
                        />
                        <Metric
                          icon={Star}
                          label="Avg. rating"
                          value={
                            (db.feedbacks || []).filter(f => f.rating > 0).length > 0
                              ? ((db.feedbacks || []).filter(f => f.rating > 0).reduce((a, f) => a + f.rating, 0) /
                                (db.feedbacks || []).filter(f => f.rating > 0).length).toFixed(1)
                              : "—"
                          }
                          detail="Out of 5 stars"
                        />
                        <Metric
                          icon={Coins}
                          label="Bonus issued"
                          value={`${(db.feedbacks || []).filter(f => f.rewardCredited).length * 50}`}
                          detail="Feedback bonus points"
                        />
                      </div>
                      {(db.feedbacks || []).length > 0 && (
                        <div className="activity-list" style={{ marginTop: 14 }}>
                          {(db.feedbacks || []).slice(0, 8).map((f) => {
                            const cust = db.customers.find(c => c.id === f.customerId);
                            return (
                              <div className="activity" key={f.id}>
                                <span className="activity-icon">💬</span>
                                <span className="grow">
                                  <strong>{cust?.name || "Unknown"}</strong>
                                  <small>
                                    {f.rating > 0 ? "★".repeat(f.rating) + "☆".repeat(5 - f.rating) + " · " : ""}
                                    {dateFmt(f.date)}
                                    {f.rewardCredited ? " · +50 pts" : ""}
                                  </small>
                                  {f.comment && (
                                    <p style={{ fontSize: 12, color: "#77776e", margin: "4px 0 0", lineHeight: 1.4 }}>
                                      "{f.comment.length > 100 ? f.comment.slice(0, 100) + "…" : f.comment}"
                                    </p>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {(db.feedbacks || []).length === 0 && (
                        <EmptyState
                          icon={MessageSquare}
                          title="No feedback yet"
                          subtitle="Customers can submit feedback from the homepage carousel."
                        />
                      )}
                    </div>
                  </div>
                  <div className="overview-note">
                    <ShieldCheck size={19} />
                    <span>
                      <strong>Demo data, real interactions.</strong> Your
                      actions update the customer app, points history, and
                      dashboard. No external messages or payments are processed.
                    </span>
                  </div>
                </>
              )}
              {page === "customers" && (
                <>
                  <AdminIntro
                    title="Know your regulars"
                    desc="Find your most loyal visitors and reconnect with those who haven't been in lately."
                  />
                  <div className="panel pad-panel">
                    <div className="filter-bar">
                      <div className="search-box">
                        <Search size={18} />
                        <input
                          placeholder="Search customer or phone"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </div>
                      <div className="chips compact">
                        {["All", "Regular", "Inactive", "Opted in"].map((f) => (
                          <button
                            key={f}
                            className={
                              "chip " + (customerFilter === f ? "chosen" : "")
                            }
                            onClick={() => setCustomerFilter(f)}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="customer-table">
                      <div className="table-head">
                        <span>Customer</span>
                        <span>Visits</span>
                        <span>Points</span>
                        <span>Last visit</span>
                        <span>Action</span>
                      </div>
                      {db.customers
                        .filter((c) => {
                          const s = customerStats(db, c.id);
                          return (
                            `${c.name} ${c.phone}`
                              .toLowerCase()
                              .includes(query.toLowerCase()) &&
                            (customerFilter === "All" ||
                              (customerFilter === "Regular" && s.visits >= 2) ||
                              (customerFilter === "Inactive" &&
                                inactiveDays(s.last) >= 30) ||
                              (customerFilter === "Opted in" && c.consent))
                          );
                        })
                        .map((c) => {
                          const s = customerStats(db, c.id);
                          return (
                            <div className="table-record" key={c.id}>
                              <div className="customer-name">
                                <span className="list-avatar">{c.name[0]}</span>
                                <span>
                                  <strong>{c.name}</strong>
                                  <small>{c.phone}</small>
                                </span>
                              </div>
                              <span>{s.visits}</span>
                              <strong>{s.points}</strong>
                              <span
                                className={
                                  inactiveDays(s.last) >= 30 ? "stale" : ""
                                }
                              >
                                {s.last ? dateFmt(s.last) : "Never"}
                              </span>
                              <button
                                className="outline-mini"
                                onClick={() =>
                                  setModal({ type: "customer", item: c })
                                }
                              >
                                View <ChevronRight size={14} />
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </>
              )}
              {page === "purchase" && (
                <PurchaseForm db={db} purchase={purchase} notify={notify} />
              )}
              {page === "menu" && (
                <>
                  <AdminIntro
                    title="Manage the menu"
                    desc="Update items here and the customer menu changes instantly."
                    action={
                      <button
                        className="button button-yellow"
                        onClick={() => setModal({ type: "editMenu" })}
                      >
                        <Plus size={17} /> Add item
                      </button>
                    }
                  />
                  <div className="panel pad-panel">
                    <div className="filter-bar">
                      <div className="search-box">
                        <Search size={18} />
                        <input
                          placeholder="Search menu items"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="admin-items">
                      {db.menus
                        .filter((m) =>
                          m.name.toLowerCase().includes(query.toLowerCase()),
                        )
                        .map((m) => (
                          <div className="admin-menu-row" key={m.id}>
                            <div className="small-product-img">
                              <img
                                src={m.image}
                                alt=""
                                onError={(e) =>
                                  (e.currentTarget.style.display = "none")
                                }
                              />
                              <span>{m.emoji}</span>
                            </div>
                            <div className="grow">
                              <strong>{m.name}</strong>
                              <small>
                                {m.category} · {money(m.price)}
                              </small>
                            </div>
                            <span
                              className={
                                "status " + (m.available ? "good" : "bad")
                              }
                            >
                              {m.available ? "Available" : "Hidden"}
                            </span>
                            <button
                              className="icon-button"
                              title="Edit"
                              onClick={() =>
                                setModal({ type: "editMenu", item: m })
                              }
                            >
                              <Edit3 size={18} />
                            </button>
                            <button
                              className="icon-button"
                              title="Toggle availability"
                              onClick={() => {
                                modify((s) => {
                                  const x = s.menus.find((x) => x.id === m.id);
                                  x.available = !x.available;
                                });
                                notify("Availability updated");
                              }}
                            >
                              {m.available ? (
                                <Eye size={18} />
                              ) : (
                                <X size={18} />
                              )}
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )}
              {page === "rewards" && (
                <>
                  <AdminIntro
                    title="Reward manager"
                    desc="Set the treats that keep customers coming back."
                    action={
                      <button
                        className="button button-yellow"
                        onClick={() => setModal({ type: "editReward" })}
                      >
                        <Plus size={17} /> Add reward
                      </button>
                    }
                  />
                  <div className="admin-reward-grid">
                    {db.rewards.map((r) => (
                      <div className="panel admin-reward" key={r.id}>
                        <span className="admin-reward-emoji">{r.emoji}</span>
                        <div className="grow">
                          <h3>{r.name}</h3>
                          <p>{r.description}</p>
                          <strong className="points-label">
                            {r.points} points
                          </strong>
                        </div>
                        <div className="reward-actions">
                          <span
                            className={"status " + (r.active ? "good" : "bad")}
                          >
                            {r.active ? "Active" : "Hidden"}
                          </span>
                          <button
                            className="outline-mini"
                            onClick={() =>
                              setModal({ type: "editReward", item: r })
                            }
                          >
                            <Edit3 size={14} /> Edit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="panel pad-panel section-gap">
                    <PanelHead
                      title="Recent redemptions"
                      subtitle="Rewards claimed using loyalty points"
                    />
                    {db.redemptions.length === 0 ? (
                      <EmptyState
                        icon={Gift}
                        title="No demo redemptions yet"
                        subtitle="Redeem a reward in the customer app to see it here."
                      />
                    ) : (
                      db.redemptions.map((r) => (
                        <div className="activity" key={r.id}>
                          <span className="activity-icon">🎁</span>
                          <span className="grow">
                            <strong>
                              {
                                db.customers.find((c) => c.id === r.customerId)
                                  ?.name
                              }{" "}
                              · {r.name}
                            </strong>
                            <small>{dateFmt(r.date)}</small>
                          </span>
                          <strong>-{r.points} pts</strong>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
              {page === "offers" && (
                <>
                  <AdminIntro
                    title="Offers & comeback campaigns"
                    desc="Create simple promotions and invite opted-in customers back."
                    action={
                      <button
                        className="button button-yellow"
                        onClick={() => setModal({ type: "editOffer" })}
                      >
                        <Plus size={17} /> Create offer
                      </button>
                    }
                  />
                  <div className="admin-reward-grid">
                    {db.offers.map((o) => (
                      <div className="panel admin-offer" key={o.id}>
                        <span className="admin-reward-emoji">{o.emoji}</span>
                        <div className="grow">
                          <h3>{o.title}</h3>
                          <p>{o.description}</p>
                          <span
                            className={"status " + (o.active ? "good" : "bad")}
                          >
                            {o.active ? "Active" : "Paused"}
                          </span>
                        </div>
                        <button
                          className="outline-mini"
                          onClick={() =>
                            setModal({ type: "editOffer", item: o })
                          }
                        >
                          <Edit3 size={14} /> Edit
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="panel pad-panel section-gap">
                    <PanelHead
                      title="Send a comeback offer"
                      subtitle="Choose an opted-in customer; messages are simulated only"
                    />
                    <SendOfferForm db={db} onSend={sendOffer} />
                  </div>
                  <div className="panel pad-panel section-gap">
                    <PanelHead
                      title="Tracked demo coupons"
                      subtitle="Offers created by this demo"
                    />
                    {db.coupons.length ? (
                      db.coupons.slice(0, 12).map((c) => (
                        <div key={c.id} className="activity">
                          <span className="activity-icon">🎟️</span>
                          <span className="grow">
                            <strong>
                              {
                                db.customers.find((x) => x.id === c.customerId)
                                  ?.name
                              }{" "}
                              · {c.code}
                            </strong>
                            <small>
                              {db.offers.find((x) => x.id === c.offerId)?.title}
                            </small>
                          </span>
                          <button
                            className="outline-mini"
                            onClick={() => {
                              modify((s) => {
                                s.coupons.find((x) => x.id === c.id).status =
                                  "redeemed";
                              });
                              notify("Coupon marked redeemed");
                            }}
                            disabled={c.status === "redeemed"}
                          >
                            {c.status === "redeemed" ? "Redeemed" : "Mark used"}
                          </button>
                        </div>
                      ))
                    ) : (
                      <EmptyState
                        icon={Tag}
                        title="No offers sent yet"
                        subtitle="Try a comeback offer for a demo customer."
                      />
                    )}
                  </div>
                </>
              )}
              {page === "messages" && (
                <>
                  <AdminIntro
                    title="Message activity"
                    desc="See simulated loyalty notifications and comeback outreach in one place."
                  />
                  <div className="panel pad-panel">
                    <div className="activity-list">
                      {db.messages.length ? (
                        db.messages.map((m) => (
                          <div key={m.id} className="message-row">
                            <span className="activity-icon">💬</span>
                            <span className="grow">
                              <strong>
                                {
                                  db.customers.find(
                                    (c) => c.id === m.customerId,
                                  )?.name
                                }{" "}
                                <span className="light-type">· {m.type}</span>
                              </strong>
                              <p>{m.text}</p>
                              <small>
                                {dateFmt(m.date)} · {m.status}
                              </small>
                            </span>
                          </div>
                        ))
                      ) : (
                        <EmptyState
                          icon={MessageCircle}
                          title="No messages yet"
                          subtitle="Record a purchase or send a comeback offer to generate messages."
                        />
                      )}
                    </div>
                  </div>
                </>
              )}
              {page === "settings" && (
                <SettingsForm
                  db={db}
                  modify={modify}
                  reset={reset}
                  notify={notify}
                />
              )}
            </main>
            <nav className="bottom-nav admin-bottom">
              {[
                ["dashboard", "Home", LayoutDashboard],
                ["customers", "Customers", Users],
                ["purchase", "Bill", Receipt],
                ["offers", "Offers", Tag],
                ["more", "More", MenuIcon],
              ].map(([id, name, I]) => (
                <button
                  key={id}
                  className={
                    page === id ||
                    (id === "more" &&
                      ![
                        "dashboard",
                        "customers",
                        "purchase",
                        "offers",
                      ].includes(page))
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    id === "more" ? setModal({ type: "more" }) : navigate(id)
                  }
                >
                  <I size={21} />
                  <span>{name}</span>
                </button>
              ))}
            </nav>
          </>
        )}
      </div>
      <div className="demo-switch">
        <span className="demo-label">LIVE PREVIEW</span>
        <button
          className={view === "customer" ? "current" : ""}
          onClick={() => {
            setView("customer");
            navigate("home");
          }}
        >
          <UserRound size={15} /> Customer
        </button>
        <button
          className={view === "admin" ? "current" : ""}
          onClick={() => {
            setView("admin");
            navigate("dashboard");
          }}
        >
          <LayoutDashboard size={15} /> Admin
        </button>
      </div>
      {toast && (
        <div className="toast">
          <CheckCircle2 size={18} />
          {toast}
          <button onClick={() => setToast("")}>
            <X size={14} />
          </button>
        </div>
      )}
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div className="modal">
            <button
              className="modal-close icon-button"
              onClick={() => setModal(null)}
            >
              <X size={21} />
            </button>
            {modal.type === "product" && (
              <>
                <div className="modal-product-photo">
                  <img src={modal.item.image} alt={modal.item.name} />
                  <span>{modal.item.emoji}</span>
                </div>
                <span className="eyebrow">
                  {modal.item.category.toUpperCase()}
                </span>
                <h2>{modal.item.name}</h2>
                <p>{modal.item.description}</p>
                <div className="detail-row">
                  <strong>{money(modal.item.price)}</strong>
                  <span className="points-label">
                    Earn {Math.floor(modal.item.price / db.restaurant.earnRate)}{" "}
                    points with a recorded purchase
                  </span>
                </div>
                <div className="modal-info">
                  <ShieldCheck size={17} /> Pay at the counter; staff record
                  your bill to credit points.
                </div>
                <button
                  className="button button-yellow full"
                  onClick={() => {
                    setModal(null);
                    navigate("wallet");
                  }}
                >
                  See your loyalty points <ArrowRight size={16} />
                </button>
              </>
            )}
            {modal.type === "redeem" && (
              <>
                <div className="modal-center-emoji">{modal.item.emoji}</div>
                <h2>Claim your {modal.item.name}?</h2>
                <p>
                  Redeeming costs <b>{modal.item.points} points</b>. Your
                  balance will become{" "}
                  <b>{stats.points - modal.item.points} points</b>.
                </p>
                <div className="modal-info">
                  <Gift size={17} /> Show the redemption confirmation to Fruzo
                  staff to claim your treat.
                </div>
                <button
                  className="button button-yellow full"
                  onClick={() => redeem(modal.item)}
                >
                  Confirm redemption <Check size={17} />
                </button>
              </>
            )}
            {modal.type === "offer" && (
              <>
                <div className="modal-center-emoji">{modal.item.emoji}</div>
                <span className="eyebrow">FRUZO SPECIAL</span>
                <h2>{modal.item.title}</h2>
                <p>{modal.item.description}</p>
                <div className="modal-info">
                  <Calendar size={17} /> Ask Fruzo staff about eligibility
                  before purchase.
                </div>
                <button
                  className="button button-yellow full"
                  onClick={() => setModal(null)}
                >
                  Sounds delicious <Check size={16} />
                </button>
              </>
            )}
            {modal.type === "customer" && (
              <>
                <span className="eyebrow">CUSTOMER DETAILS</span>
                <h2>{modal.item.name}</h2>
                <p>{modal.item.phone}</p>
                <div className="modal-mini-stats">
                  {Object.entries({
                    Visits: customerStats(db, modal.item.id).visits,
                    Points: customerStats(db, modal.item.id).points,
                    Spent: money(customerStats(db, modal.item.id).spent),
                  }).map(([k, v]) => (
                    <div key={k}>
                      <strong>{v}</strong>
                      <small>{k}</small>
                    </div>
                  ))}
                </div>
                <p className="muted">
                  Last visit: {dateFmt(customerStats(db, modal.item.id).last)}
                </p>
                <p className="muted">
                  Marketing consent: {modal.item.consent ? "Yes" : "No"}
                </p>
                <button
                  className="button button-yellow full"
                  onClick={() => {
                    setDb((s) => ({ ...s, activeCustomer: modal.item.id }));
                    setModal(null);
                    setView("customer");
                    navigate("wallet");
                  }}
                >
                  View this customer's wallet <ArrowRight size={15} />
                </button>
              </>
            )}
            {modal.type === "editMenu" && (
              <EditMenu
                item={modal.item}
                onSave={(data) => {
                  modify((s) => {
                    if (modal.item) {
                      Object.assign(
                        s.menus.find((m) => m.id === modal.item.id),
                        data,
                      );
                    } else {
                      s.menus.unshift({ id: newId(), ...data });
                    }
                  });
                  setModal(null);
                  notify("Menu item saved!");
                }}
              />
            )}
            {modal.type === "editReward" && (
              <EditReward
                item={modal.item}
                onSave={(data) => {
                  modify((s) => {
                    if (modal.item) {
                      Object.assign(
                        s.rewards.find((m) => m.id === modal.item.id),
                        data,
                      );
                    } else {
                      s.rewards.unshift({ id: newId(), ...data });
                    }
                  });
                  setModal(null);
                  notify("Reward saved!");
                }}
              />
            )}
            {modal.type === "editOffer" && (
              <EditOffer
                item={modal.item}
                onSave={(data) => {
                  modify((s) => {
                    if (modal.item) {
                      Object.assign(
                        s.offers.find((m) => m.id === modal.item.id),
                        data,
                      );
                    } else {
                      s.offers.unshift({ id: newId(), ...data });
                    }
                  });
                  setModal(null);
                  notify("Offer saved!");
                }}
              />
            )}
            {modal.type === "more" && (
              <>
                <h2>More tools</h2>
                <p>Everything you need to run the Fruzo rewards club.</p>
                <div className="more-nav">
                  {adminNav
                    .filter(
                      (n) =>
                        ![
                          "dashboard",
                          "customers",
                          "purchase",
                          "offers",
                        ].includes(n[0]),
                    )
                    .map(([id, name, I]) => (
                      <button key={id} onClick={() => navigate(id)}>
                        <I size={20} />
                        {name}
                        <ChevronRight size={17} />
                      </button>
                    ))}
                  <button
                    onClick={() => {
                      setView("customer");
                      navigate("home");
                    }}
                  >
                    <Eye size={20} /> Customer preview{" "}
                    <ChevronRight size={17} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Brand({ compact = false }) {
  return (
    <div className={"brand " + (compact ? "brand-compact" : "")}>
      <span className="logo-word">
        fruzo<span className="logo-dot">.</span>
      </span>
      <span className="logo-tagline">We blend happiness</span>
    </div>
  );
}

function SectionHeading({ label, title }) {
  return (
    <div className="section-title">
      <span className="eyebrow">{label}</span>
      <h2>{title}</h2>
    </div>
  );
}

function PageIntro({ eyebrow, title, description }) {
  return (
    <div className="page-intro">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}

function FoodCard({ item, onClick }) {
  return (
    <button
      className={"food-card " + (!item.available ? "unavailable" : "")}
      onClick={onClick}
    >
      <div className="food-photo">
        <img
          src={item.image}
          alt={item.name}
          loading="lazy"
          onError={(e) => (e.currentTarget.style.opacity = 0)}
        />
        <span className="food-fallback">{item.emoji}</span>
        {item.trending && (
          <span className="food-tag">
            <Star size={11} /> Popular
          </span>
        )}
        {!item.available && (
          <span className="unavailable-tag">Not available</span>
        )}
      </div>
      <div className="food-info">
        <span className="food-category">{item.category}</span>
        <h3>{item.name}</h3>
        <p>{item.description}</p>
        <div>
          <strong>{money(item.price)}</strong>
          <span className="round-add">
            <ArrowRight size={18} />
          </span>
        </div>
      </div>
    </button>
  );
}

function OfferCard({ offer, onClick }) {
  return (
    <button className="offer-card" onClick={onClick}>
      <span className="offer-decoration">{offer.emoji}</span>
      <span className="eyebrow">EXCLUSIVE AT FRUZO</span>
      <h3>{offer.title}</h3>
      <p>{offer.description}</p>
      <strong>
        Explore offer <ArrowRight size={16} />
      </strong>
    </button>
  );
}

function EmptyState({ icon: I, title, subtitle }) {
  return (
    <div className="empty-state">
      <I size={35} />
      <h3>{title}</h3>
      <p>{subtitle}</p>
    </div>
  );
}

function AdminIntro({ title, desc, action }) {
  return (
    <div className="admin-title-row">
      <div>
        <span className="eyebrow">FRUZO BUSINESS</span>
        <h1>{title}</h1>
        <p>{desc}</p>
      </div>
      {action}
    </div>
  );
}

function Metric({ icon: I, label, value, detail }) {
  return (
    <div className="metric">
      <span className="metric-icon">
        <I size={23} />
      </span>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function PanelHead({ title, subtitle, right }) {
  return (
    <div className="panel-head">
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      {right}
    </div>
  );
}

function VisitBars({ purchases }) {
  const bins = Array.from({ length: 6 }, (_, i) => {
    const end = (5 - i) * 7;
    return {
      label: `W${i + 1}`,
      count: purchases.filter((p) => {
        const days = inactiveDays(p.date);
        return days >= end && days < end + 7;
      }).length,
    };
  });
  const max = Math.max(1, ...bins.map((b) => b.count));
  return (
    <div className="bars-chart">
      <div className="bars-inner">
        {bins.map((b) => (
          <div className="bar-group" key={b.label}>
            <strong>{b.count}</strong>
            <div
              className="bar"
              style={{ height: `${Math.max(7, (b.count / max) * 175)}px` }}
            />
            <span>{b.label}</span>
          </div>
        ))}
      </div>
      <p>
        Visits by week · {bins.reduce((a, b) => a + b.count, 0)} recorded during
        this period
      </p>
    </div>
  );
}

function PurchaseForm({ db, purchase, notify }) {
  const [c, setC] = useState(db.activeCustomer);
  const [amount, setAmount] = useState("");
  const [success, setSuccess] = useState(false);
  const points = Math.floor(Number(amount || 0) / db.restaurant.earnRate);
  return (
    <>
      <AdminIntro
        title="Record a purchase"
        desc="One simple step at the counter. Choose a customer, enter their bill and credit points."
      />
      <div className="purchase-layout">
        <form
          className="panel purchase-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (purchase(c, amount)) {
              setAmount("");
              setSuccess(true);
            }
          }}
        >
          <span className="eyebrow">NEW LOYALTY TRANSACTION</span>
          <label>Customer</label>
          <select
            value={c}
            onChange={(e) => {
              setC(e.target.value);
              setSuccess(false);
            }}
          >
            {db.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.phone}
              </option>
            ))}
          </select>
          <label>Bill amount (₹)</label>
          <div className="currency-input">
            <span>₹</span>
            <input
              type="number"
              required
              min="1"
              step="1"
              placeholder="e.g. 450"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setSuccess(false);
              }}
            />
          </div>
          <div className="calculation">
            <span>Customer earns</span>
            <strong>
              <Coins size={22} />
              {Number.isFinite(points) && points >= 0 ? points : 0} points
            </strong>
            <small>₹{db.restaurant.earnRate} spent = 1 point</small>
          </div>
          <button className="button button-yellow full" type="submit">
            <Check size={17} /> Confirm & credit points
          </button>
          {success && (
            <div className="success-note">
              <CheckCircle2 size={18} /> Purchase recorded. Points and analytics
              updated!
            </div>
          )}
        </form>
        <div className="panel explainer">
          <span className="eyebrow">THE SIMPLE FRUZO FLOW</span>
          <h2>Keep the visit. Keep the customer.</h2>
          {[
            [
              "1",
              "Find the customer",
              "Search by name and choose their loyalty account.",
            ],
            [
              "2",
              "Enter the bill",
              "Record the final amount after payment at the counter.",
            ],
            [
              "3",
              "Reward instantly",
              "Points, visit history and dashboard update together.",
            ],
          ].map(([n, t, d]) => (
            <div className="step" key={n}>
              <span>{n}</span>
              <div>
                <strong>{t}</strong>
                <p>{d}</p>
              </div>
            </div>
          ))}
          <div className="explainer-foot">
            <MessageCircle size={19} /> A sample thank-you message is generated
            in the Messages tab. Nothing is sent externally.
          </div>
        </div>
      </div>
    </>
  );
}

function SendOfferForm({ db, onSend }) {
  const [c, setC] = useState(db.customers.find((c) => c.consent)?.id || "");
  const [o, setO] = useState(db.offers.find((o) => o.active)?.id || "");
  return (
    <div className="send-form">
      <div>
        <label>Customer</label>
        <select value={c} onChange={(e) => setC(e.target.value)}>
          {db.customers
            .filter((c) => c.consent)
            .map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
        </select>
      </div>
      <div>
        <label>Offer</label>
        <select value={o} onChange={(e) => setO(e.target.value)}>
          {db.offers
            .filter((o) => o.active)
            .map((o) => (
              <option value={o.id} key={o.id}>
                {o.title}
              </option>
            ))}
        </select>
      </div>
      <button
        className="button button-yellow"
        disabled={!c || !o}
        onClick={() => onSend(c, o)}
      >
        <Send size={16} /> Simulate offer
      </button>
    </div>
  );
}

function EditMenu({ item, onSave }) {
  const [name, setName] = useState(item?.name || "");
  const [price, setPrice] = useState(item?.price || "");
  const [category, setCategory] = useState(item?.category || "Juices");
  const [description, setDescription] = useState(item?.description || "");
  const [emoji, setEmoji] = useState(item?.emoji || "🥤");
  const [image, setImage] = useState(item?.image || "");
  const [trending, setTrending] = useState(item?.trending || false);
  const [available, setAvailable] = useState(item?.available ?? true);
  return (
    <form
      className="edit-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (Number(price) <= 0) return;
        onSave({
          name: name.trim(),
          price: Number(price),
          category,
          description: description.trim(),
          emoji,
          image,
          trending,
          available,
        });
      }}
    >
      <h2>{item ? "Edit menu item" : "Add a menu item"}</h2>
      <p>Changes are reflected in the customer storefront.</p>
      <label>
        Item name
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Mango Magic"
        />
      </label>
      <div className="form-columns">
        <label>
          Price (₹)
          <input
            type="number"
            min="1"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <label>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {["Juices", "Shakes", "Mocktails", "Snacks"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Description
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </label>
      <div className="form-columns">
        <label>
          Emoji
          <input value={emoji} onChange={(e) => setEmoji(e.target.value)} />
        </label>
        <label>
          Image URL
          <input value={image} onChange={(e) => setImage(e.target.value)} />
        </label>
      </div>
      <label className="check-label">
        <input
          type="checkbox"
          checked={available}
          onChange={(e) => setAvailable(e.target.checked)}
        />{" "}
        Available to customers
      </label>
      <label className="check-label">
        <input
          type="checkbox"
          checked={trending}
          onChange={(e) => setTrending(e.target.checked)}
        />{" "}
        Mark as popular
      </label>
      <button className="button button-yellow full" type="submit">
        Save menu item <Check size={17} />
      </button>
    </form>
  );
}

function EditReward({ item, onSave }) {
  const [name, setName] = useState(item?.name || "");
  const [description, setDescription] = useState(item?.description || "");
  const [points, setPoints] = useState(item?.points || "");
  const [emoji, setEmoji] = useState(item?.emoji || "🎁");
  const [active, setActive] = useState(item?.active ?? true);
  return (
    <form
      className="edit-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          name: name.trim(),
          description: description.trim(),
          points: Number(points),
          emoji,
          active,
        });
      }}
    >
      <h2>{item ? "Edit reward" : "Create reward"}</h2>
      <p>Give Fruzo members something to look forward to.</p>
      <label>
        Reward name
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        Description
        <input
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <div className="form-columns">
        <label>
          Points required
          <input
            type="number"
            min="1"
            required
            value={points}
            onChange={(e) => setPoints(e.target.value)}
          />
        </label>
        <label>
          Emoji
          <input value={emoji} onChange={(e) => setEmoji(e.target.value)} />
        </label>
      </div>
      <label className="check-label">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />{" "}
        Active reward
      </label>
      <button className="button button-yellow full" type="submit">
        Save reward <Check size={17} />
      </button>
    </form>
  );
}

function EditOffer({ item, onSave }) {
  const [title, setTitle] = useState(item?.title || "");
  const [description, setDescription] = useState(item?.description || "");
  const [type, setType] = useState(item?.type || "comeback");
  const [active, setActive] = useState(item?.active ?? true);
  const [emoji, setEmoji] = useState(item?.emoji || "🎉");
  return (
    <form
      className="edit-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          title: title.trim(),
          description: description.trim(),
          type,
          active,
          emoji,
          until: new Date(Date.now() + 30 * 86400000).toISOString(),
          ...(type === "multiplier"
            ? { multiplier: 2, category: "Juices" }
            : {}),
        });
      }}
    >
      <h2>{item ? "Edit offer" : "Create an offer"}</h2>
      <p>
        Offers show in the customer app. Comeback offers can be sent as
        simulated notifications.
      </p>
      <label>
        Offer title
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label>
        Short description
        <textarea
          required
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <div className="form-columns">
        <label>
          Offer type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="comeback">Comeback</option>
            <option value="display">General promotion</option>
            <option value="multiplier">2× points (display only)</option>
          </select>
        </label>
        <label>
          Emoji
          <input value={emoji} onChange={(e) => setEmoji(e.target.value)} />
        </label>
      </div>
      <label className="check-label">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />{" "}
        Offer active
      </label>
      <button className="button button-yellow full" type="submit">
        Save offer <Check size={17} />
      </button>
    </form>
  );
}

function SettingsForm({ db, modify, reset, notify }) {
  const [name, setName] = useState(db.restaurant.name);
  const [tagline, setTagline] = useState(db.restaurant.tagline);
  const [rate, setRate] = useState(db.restaurant.earnRate);
  const [googleReviewUrl, setGoogleReviewUrl] = useState(db.restaurant.googleReviewUrl || "");
  const [googleMapsUrl, setGoogleMapsUrl] = useState(db.restaurant.googleMapsUrl || "");

  return (
    <>
      <AdminIntro
        title="Restaurant settings"
        desc="Simple controls for your Fruzo demo and loyalty programme."
      />
      <form
        className="panel settings-form"
        onSubmit={(e) => {
          e.preventDefault();
          modify((s) => {
            s.restaurant.name = name;
            s.restaurant.tagline = tagline;
            s.restaurant.earnRate = Math.max(1, Number(rate));
            s.restaurant.googleReviewUrl = googleReviewUrl.trim();
            s.restaurant.googleMapsUrl = googleMapsUrl.trim();
          });
          notify("Settings saved");
        }}
      >
        <h3>Restaurant details</h3>
        <label>
          Restaurant name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Tagline
          <input
            required
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
          />
        </label>
        <label>
          Spend required per point (₹)
          <input
            type="number"
            min="1"
            required
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </label>
        <label>
          Google Review URL
          <input
            type="url"
            placeholder="https://g.page/r/..."
            value={googleReviewUrl}
            onChange={(e) => setGoogleReviewUrl(e.target.value)}
          />
          <small style={{ color: "#8b8b83", fontSize: 11, marginTop: 4, display: "block" }}>
            Paste your Google Maps review link. Shown on customer app carousel.
          </small>
        </label>
        <label>
          Google Maps location URL
          <input
            type="url"
            placeholder="https://maps.app.goo.gl/..."
            value={googleMapsUrl}
            onChange={(e) => setGoogleMapsUrl(e.target.value)}
          />
          <small style={{ color: "#8b8b83", fontSize: 11, marginTop: 4, display: "block" }}>
            Paste your restaurant's Google Maps share link. If left empty, defaults to searching Fruzo.
          </small>
        </label>
        <button className="button button-yellow" type="submit">
          Save changes <Check size={17} />
        </button>
      </form>
      <div className="panel settings-form section-gap">
        <h3>Demo controls</h3>
        <p>
          Restore Fruzo to the initial dataset with sample customers, recorded
          purchases and offers.
        </p>
        <button className="button outline-danger" onClick={reset}>
          <RotateCcw size={17} /> Reset all demo data
        </button>
      </div>
    </>
  );
}

const REFERRAL_BONUS_PTS = 100;
const FEEDBACK_BONUS_PTS = 50;
const CAROUSEL_INTERVAL_MS = 2000;

function HomePromoCarousel({ db, active, modify, notify }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", loop: true });
  const [selected, setSelected] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [typing, setTyping] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const googleUrl = db.restaurant.googleReviewUrl || "";
  const mapsUrl =
    db.restaurant.googleMapsUrl ||
    "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(db.restaurant.name || "Fruzo");
  const referralUrl = active.referralCode
    ? window.location.origin + window.location.pathname + "?ref=" + active.referralCode
    : "";
  const alreadyRewarded = (db.feedbacks || []).some(
    (f) => f.customerId === active.id && f.rewardCredited
  );

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const midForm = typing || rating > 0 || comment.trim().length > 0;
  const paused = hovering || midForm || reducedMotion;

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi || paused) return;
    const id = setInterval(() => emblaApi.scrollNext(), CAROUSEL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [emblaApi, paused, selected]);

  const copyLink = useCallback(() => {
    if (!referralUrl) return;
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(referralUrl)
        .then(() => notify("Referral link copied to clipboard!"))
        .catch(() => notify("Could not copy - open your Profile to copy manually."));
    } else {
      notify("Open your Profile to copy the link.");
    }
  }, [referralUrl, notify]);

  const shareLink = useCallback(() => {
    if (!referralUrl) return;
    if (navigator.share) {
      navigator
        .share({
          title: "Join me at Fruzo!",
          text: "Join Fruzo for fresh blends and loyalty rewards. Use my invite link:",
          url: referralUrl,
        })
        .catch((e) => {
          if (e && e.name !== "AbortError") copyLink();
        });
    } else {
      copyLink();
    }
  }, [referralUrl, copyLink]);

  function submitFeedback() {
    if (rating === 0 && !comment.trim()) {
      notify("Add a rating or a short comment first");
      return;
    }
    const credit = !alreadyRewarded;
    const d = new Date().toISOString();
    modify((s) => {
      if (!Array.isArray(s.feedbacks)) s.feedbacks = [];
      s.feedbacks.unshift({
        id: newId(),
        customerId: active.id,
        rating,
        comment: comment.trim(),
        date: d,
        rewardCredited: credit,
      });
      if (credit) {
        s.points.unshift({
          id: newId(),
          customerId: active.id,
          amount: FEEDBACK_BONUS_PTS,
          type: "feedback",
          date: d,
          detail: "Thanks for your feedback",
        });
        s.messages.unshift({
          id: newId(),
          customerId: active.id,
          date: d,
          type: "feedback",
          text: `Thank you for your feedback! You earned ${FEEDBACK_BONUS_PTS} bonus points.`,
          status: "Demo notification",
        });
      }
    });
    setRating(0);
    setComment("");
    setTyping(false);
    notify(
      credit
        ? `Thanks! ${FEEDBACK_BONUS_PTS} bonus points added`
        : "Thanks for your feedback!"
    );
  }

  const S = {
    card: (bg, color) => ({
      position: "relative",
      overflow: "hidden",
      flex: 1,
      background: bg,
      color,
      borderRadius: 28,
      padding: "24px 26px 26px",
      boxSizing: "border-box",
      boxShadow: "0 12px 32px rgba(0,0,0,.08)",
      minHeight: 220,
      display: "flex",
      flexDirection: "column",
      gap: 6,
      transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease",
    }),
    blob: (size, top, right, bg) => ({
      position: "absolute",
      width: size,
      height: size,
      top,
      right,
      borderRadius: "50%",
      background: bg,
      pointerEvents: "none",
      filter: "blur(20px)",
      opacity: 0.7,
    }),
    bigEmoji: {
      position: "absolute",
      right: 18,
      bottom: 8,
      fontSize: 88,
      opacity: 0.15,
      transform: "rotate(-12deg)",
      pointerEvents: "none",
      userSelect: "none",
      transition: "transform 0.4s ease",
    },
    badge: (bg, color) => ({
      width: 48,
      height: 48,
      borderRadius: 16,
      background: bg,
      color,
      display: "grid",
      placeItems: "center",
      boxShadow: "0 6px 16px rgba(0,0,0,.12)",
      flexShrink: 0,
      transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
    }),
    pill: (bg, color) => ({
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: bg,
      color,
      fontSize: 10,
      fontWeight: 900,
      letterSpacing: "0.12em",
      padding: "6px 12px",
      borderRadius: 999,
      backdropFilter: "blur(8px)",
    }),
    title: { margin: "8px 0 2px", fontSize: 23, lineHeight: 1.18, fontWeight: 800, position: "relative" },
    sub: { margin: "0 0 14px", fontSize: 13, lineHeight: 1.5, opacity: 0.9, maxWidth: 440, position: "relative" },
    row: { display: "flex", gap: 10, flexWrap: "wrap", position: "relative", marginTop: "auto" },
    btn: (bg, color) => ({
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      background: bg,
      color,
      border: "none",
      borderRadius: 999,
      padding: "12px 20px",
      fontSize: 13,
      fontWeight: 800,
      cursor: "pointer",
      textDecoration: "none",
      boxShadow: "0 4px 14px rgba(0,0,0,.15)",
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
    }),
    ghostBtn: (color) => ({
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      background: "rgba(255,255,255,.25)",
      backdropFilter: "blur(10px)",
      color,
      border: "1.5px solid rgba(255,255,255,.4)",
      borderRadius: 999,
      padding: "11px 18px",
      fontSize: 13,
      fontWeight: 800,
      cursor: "pointer",
      transition: "all 0.2s ease",
    }),
    arrow: {
      width: 38,
      height: 38,
      borderRadius: "50%",
      border: "1px solid #e7e6df",
      background: "#fff",
      display: "grid",
      placeItems: "center",
      cursor: "pointer",
      color: "#3a3a30",
      boxShadow: "0 4px 12px rgba(0,0,0,.06)",
      transition: "all 0.2s ease",
    },
  };

  const slides = [];

  // 1. Refer a friend
  slides.push(
    <div key="ref" className="interactive-card" style={S.card("linear-gradient(135deg, #ffe36e 0%, #ffb703 100%)", "#2b2400")}>
      <span style={S.blob(180, -60, -40, "rgba(255,255,255,.4)")} />
      <span style={S.blob(100, "auto", 90, "rgba(255,255,255,.25)")} />
      <span style={S.bigEmoji}>🎁</span>
      <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
        <span className="badge-icon" style={S.badge("#2b2400", "#ffe36e")}>
          <UserPlus size={22} />
        </span>
        <span style={S.pill("rgba(43,36,0,.12)", "#2b2400")}>
          <Sparkles size={12} /> REFER A FRIEND
        </span>
      </div>
      <h3 style={S.title}>Share the love, earn {REFERRAL_BONUS_PTS} points</h3>
      <p style={S.sub}>
        When a friend makes their first purchase, you get {REFERRAL_BONUS_PTS} bonus points. Everybody wins.
      </p>
      <div style={S.row}>
        <button className="btn-hover-effect" style={S.btn("#2b2400", "#ffe36e")} onClick={shareLink}>
          <Share2 size={15} /> Share invite
        </button>
        <button className="btn-ghost-effect" style={S.ghostBtn("#2b2400")} onClick={copyLink}>
          <Copy size={15} /> Copy link
        </button>
      </div>
    </div>
  );

  // 2. Updated Google Map & Review Banner (Rich Deep Sunset Vibrant Theme)
  slides.push(
    <div
      key="google-review-banner"
      className="interactive-card"
      style={{
        ...S.card("linear-gradient(135deg, #FF4E50 0%, #F9D423 100%)", "#ffffff"),
        position: "relative",
        boxShadow: "0 14px 36px rgba(255, 78, 80, 0.25)",
      }}
    >
      <span style={S.blob(200, -70, -40, "rgba(255,255,255,.35)")} />
      <span style={S.blob(110, "auto", 100, "rgba(255,255,255,.25)")} />
      <span style={S.bigEmoji}>⭐</span>
      <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative", zIndex: 1 }}>
        <span className="badge-icon" style={S.badge("#ffffff", "#FF4E50")}>
          <MapPin size={24} fill="#FF4E50" color="#FF4E50" />
        </span>
        <span style={S.pill("rgba(255,255,255,.25)", "#ffffff")}>
          <Heart size={12} fill="#ffffff" /> REVIEW US ON GOOGLE
        </span>
      </div>
      <h3 style={{ ...S.title, textShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
        Love Fruzo? Rate us on Google Maps!
      </h3>
      <div style={{ display: "flex", gap: 3, margin: "2px 0 6px", position: "relative", zIndex: 1 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} size={18} color="#ffffff" fill="#ffffff" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" }} />
        ))}
      </div>
      <p style={{ ...S.sub, color: "rgba(255, 255, 255, 0.95)" }}>
        Your feedback helps us grow and keep blending happiness for our wonderful community!
      </p>
      <div style={S.row}>
        <a
          href={googleUrl || mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-hover-effect"
          style={S.btn("#ffffff", "#D31027")}
        >
          <ThumbsUp size={16} /> Review us on Google <ExternalLink size={14} />
        </a>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost-effect"
          style={S.ghostBtn("#ffffff")}
        >
          <Navigation size={15} /> Get Directions
        </a>
      </div>
    </div>
  );

  // 3. Private feedback
  slides.push(
    <div key="fb" className="interactive-card" style={S.card("linear-gradient(135deg, #ff9ab0 0%, #ff5c8a 100%)", "#fff")}>
      <span style={S.blob(180, -60, -40, "rgba(255,255,255,.25)")} />
      <span style={S.bigEmoji}>💬</span>
      <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
        <span className="badge-icon" style={S.badge("#fff", "#ff5c8a")}>
          <MessageSquare size={22} />
        </span>
        <span style={S.pill("rgba(255,255,255,.22)", "#fff")}>
          <ShieldCheck size={12} /> PRIVATE FEEDBACK
        </span>
        {!alreadyRewarded && (
          <span style={S.pill("#fff", "#d6336c")}>
            <Coins size={12} /> +{FEEDBACK_BONUS_PTS} PTS
          </span>
        )}
      </div>
      <h3 style={S.title}>Tell us how we did</h3>
      <p style={{ ...S.sub, marginBottom: 8 }}>Only the Fruzo team sees this.</p>
      <div style={{ display: "flex", gap: 2, marginBottom: 8, position: "relative" }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setRating(n === rating ? 0 : n)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 2,
              lineHeight: 0,
              transition: "transform .2s cubic-bezier(0.34, 1.56, 0.64, 1)",
              transform: n <= rating ? "scale(1.2)" : "scale(1)",
            }}
          >
            <Star
              size={26}
              color={n <= rating ? "#ffd43b" : "rgba(255,255,255,.75)"}
              fill={n <= rating ? "#ffd43b" : "transparent"}
            />
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "stretch", position: "relative", flexWrap: "wrap" }}>
        <textarea
          rows={1}
          value={comment}
          placeholder="Anything we could do better?"
          onChange={(e) => setComment(e.target.value)}
          onFocus={() => setTyping(true)}
          onBlur={() => setTyping(false)}
          style={{
            flex: 1,
            minWidth: 160,
            boxSizing: "border-box",
            padding: "11px 14px",
            border: "none",
            borderRadius: 14,
            font: "inherit",
            fontSize: 13,
            color: "#2b2b25",
            background: "rgba(255,255,255,.95)",
            resize: "none",
            outline: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          }}
        />
        <button className="btn-hover-effect" style={S.btn("#fff", "#d6336c")} onClick={submitFeedback}>
          <Send size={15} /> Send
        </button>
      </div>
    </div>
  );

  return (
    <section
      style={{ margin: "20px 0" }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <style>{`
        @keyframes fruzoDotFill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        
        .interactive-card:hover {
          transform: translateY(-4px) scale(1.005);
        }
        .interactive-card:hover .badge-icon {
          transform: scale(1.1) rotate(4deg);
        }
        .btn-hover-effect:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(0,0,0,0.2) !important;
        }
        .btn-ghost-effect:hover {
          background: rgba(255,255,255,0.4) !important;
          transform: translateY(-2px);
        }
        .arrow-btn:hover {
          transform: scale(1.1);
          background: #f8f8f2 !important;
          box-shadow: 0 6px 16px rgba(0,0,0,0.1) !important;
        }
      `}</style>

      <div ref={emblaRef} style={{ overflow: "hidden", borderRadius: 28, padding: "4px 2px 14px" }}>
        <div style={{ display: "flex" }}>
          {slides.map((s, i) => (
            <div key={i} style={{ flex: "0 0 100%", minWidth: 0, padding: "0 6px", display: "flex" }}>
              {s}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <button
          type="button"
          aria-label="Previous"
          className="arrow-btn"
          style={S.arrow}
          onClick={() => emblaApi && emblaApi.scrollPrev()}
        >
          <ChevronLeft size={18} />
        </button>
        <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
          {slides.map((_, i) => {
            const on = i === selected;
            return (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => emblaApi && emblaApi.scrollTo(i)}
                style={{
                  position: "relative",
                  overflow: "hidden",
                  width: on ? 32 : 9,
                  height: 9,
                  borderRadius: 5,
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  background: "#e3e0cf",
                  transition: "all .3s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                {on && (
                  <span
                    key={selected}
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "#f2b705",
                      transformOrigin: "left",
                      animation: paused
                        ? "none"
                        : `fruzoDotFill ${CAROUSEL_INTERVAL_MS}ms linear forwards`,
                      transform: paused ? "scaleX(1)" : undefined,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-label="Next"
          className="arrow-btn"
          style={S.arrow}
          onClick={() => emblaApi && emblaApi.scrollNext()}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}

function ReferralSection({ db, active, modify, notify }) {
  const referralCode = active.referralCode || "";
  const referralUrl = referralCode
    ? window.location.origin +
      window.location.pathname +
      "?ref=" +
      referralCode
    : "";

  const myReferrals = (db.referrals || []).filter(
    (r) => r.referrerCustomerId === active.id
  );
  const rewardedReferrals = myReferrals.filter((r) => r.status === "rewarded");
  const pendingReferrals = myReferrals.filter((r) => r.status === "pending");

  const [simCustomerId, setSimCustomerId] = React.useState("");
  const eligible = db.customers.filter(
    (c) =>
      c.id !== active.id &&
      !c.referredBy &&
      !(db.referrals || []).some((r) => r.referredCustomerId === c.id)
  );

  function handleSimulateReferral() {
    if (!simCustomerId) { notify("Pick a customer to simulate the referral"); return; }
    if (simCustomerId === active.id) { notify("Self-referral is not allowed"); return; }
    const target = db.customers.find((c) => c.id === simCustomerId);
    if (!target) return;
    if (target.referredBy) { notify("That customer already has a referrer"); return; }
    if ((db.referrals || []).some((r) => r.referredCustomerId === simCustomerId)) {
      notify("A referral record already exists for that customer");
      return;
    }
    const rid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    modify((s) => {
      const cust = s.customers.find((c) => c.id === simCustomerId);
      if (!cust || cust.referredBy) return;
      cust.referredBy = active.id;
      if (!Array.isArray(s.referrals)) s.referrals = [];
      s.referrals.push({
        id: rid,
        referrerCustomerId: active.id,
        referredCustomerId: simCustomerId,
        status: "pending",
        createdAt: new Date().toISOString(),
        qualifyingPurchaseId: null,
        rewardPoints: REFERRAL_BONUS_PTS,
        rewardedAt: null,
      });
    });
    setSimCustomerId("");
    notify(
      "Referral attributed! Record " +
        target.name.split(" ")[0] +
        "'s first purchase in Admin to earn " +
        REFERRAL_BONUS_PTS +
        " pts."
    );
  }

  function copyLink() {
    if (!referralUrl) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(referralUrl)
        .then(() => notify("Referral link copied to clipboard!"))
        .catch(() => {
          const el = document.getElementById("referral-link-input");
          if (el) el.select();
          notify("Could not auto-copy - select and copy the link manually.");
        });
    } else {
      const el = document.getElementById("referral-link-input");
      if (el) el.select();
      notify("Copy the link from the field above.");
    }
  }

  function shareLink() {
    if (!referralUrl) return;
    const shareData = {
      title: "Join me at Fruzo!",
      text:
        "Hey! Join Fruzo and enjoy fresh blends and loyalty rewards. I will earn " +
        REFERRAL_BONUS_PTS +
        " bonus points when you make your first purchase. Use my invite link:",
      url: referralUrl,
    };
    if (navigator.share) {
      navigator.share(shareData).catch((e) => {
        if (e && e.name !== "AbortError") copyLink();
      });
    } else {
      copyLink();
    }
  }

  return (
    <div className="selector-card" style={{ marginTop: 20 }}>
      <label>REFER A FRIEND</label>
      <p style={{ fontSize: 13, margin: "10px 0 14px", color: "#77776e" }}>
        Invite a friend to Fruzo. When they complete their first qualifying
        purchase, you will earn{" "}
        <strong>{REFERRAL_BONUS_PTS} loyalty points</strong>.
      </p>

      <div style={{ marginBottom: 12 }}>
        <input
          id="referral-link-input"
          readOnly
          value={referralUrl}
          style={{
            width: "100%",
            fontSize: 11,
            padding: "10px 12px",
            border: "1px solid #e7e6df",
            borderRadius: 9,
            background: "#fafaf7",
            color: "#5a5a52",
            cursor: "text",
            boxSizing: "border-box",
          }}
          onClick={(e) => e.target.select()}
        />
      </div>

      <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
        <button className="outline-mini" onClick={copyLink}>
          <Copy size={14} /> Copy link
        </button>
        <button className="outline-mini" onClick={shareLink}>
          <Send size={14} /> Share
        </button>
      </div>

      {myReferrals.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", color: "#a68e29", marginBottom: 8 }}>
            YOUR REFERRALS
          </div>
          <div className="transaction-list">
            {myReferrals.map((r) => {
              const refCust = db.customers.find((c) => c.id === r.referredCustomerId);
              return (
                <div className="transaction" key={r.id}>
                  <span className="transaction-icon">
                    {r.status === "rewarded" ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                  </span>
                  <span className="grow">
                    <strong style={{ fontSize: 13 }}>{refCust ? refCust.name : "Friend"}</strong>
                    <small>
                      {r.status === "rewarded"
                        ? "Rewarded - " + dateFmt(r.rewardedAt)
                        : "Pending first purchase"}
                    </small>
                  </span>
                  <strong
                    className={r.status === "rewarded" ? "positive" : "muted"}
                    style={{ fontSize: 12 }}
                  >
                    {r.status === "rewarded" ? "+" + r.rewardPoints + " pts" : "Pending"}
                  </strong>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 12 }}>
            <span className="muted">{rewardedReferrals.length} rewarded</span>
            <span className="muted">{pendingReferrals.length} pending</span>
          </div>
        </div>
      )}

      {eligible.length > 0 && (
        <div style={{ marginTop: 16, borderTop: "1px dashed #e0dac8", paddingTop: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", color: "#a68e29", marginBottom: 8 }}>
            DEMO: SIMULATE A REFERRAL SIGN-UP
          </div>
          <p style={{ fontSize: 11, color: "#8b8b83", margin: "0 0 10px" }}>
            Normally a friend opens your link and registers. Pick any unattributed customer
            to simulate them signing up via your link. Then record their first purchase in
            Admin to see the bonus credited.
          </p>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center" }}>
            <select
              value={simCustomerId}
              onChange={(e) => setSimCustomerId(e.target.value)}
              style={{ flex: 1, minWidth: 0 }}
            >
              <option value="">-- Choose a customer --</option>
              {eligible.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              className="outline-mini"
              onClick={handleSimulateReferral}
              disabled={!simCustomerId}
            >
              <UserRound size={14} /> Simulate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;