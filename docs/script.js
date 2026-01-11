const buttons = document.querySelectorAll("button[data-copy]");
const heroSections = document.querySelectorAll(
  ".section, .hero, .cta, .hero-card"
);

heroSections.forEach((el) => el.classList.add("reveal"));

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.2 }
);

heroSections.forEach((el) => observer.observe(el));

const toast = document.createElement("div");
toast.className = "toast";
document.body.appendChild(toast);

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 1800);
}

buttons.forEach((button) => {
  button.addEventListener("click", async () => {
    const text = button.getAttribute("data-copy");
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast(`Copied: ${text}`);
    } catch (err) {
      showToast("Copy failed");
    }
  });
});
