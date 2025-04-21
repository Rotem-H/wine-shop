// =======================
// IndexedDB Setup via Dexie.js
// =======================
const db = new Dexie("WineShopDB");
db.version(5).stores({
    items: "++id, name, category",
    cart: "++id, name",
    deliveryInfo: "id",
    paymentDetails: "id",
    users: "username",
    session: "key",
    orders: "++id"   
});
function getRedirectMode() {
    const params = new URLSearchParams(window.location.search);
    return params.get("from") || "homepage";
}

// משתנה items שנטען מה-DB
let items = []; // Loaded from IndexedDB asynchronously

// הצגת מוצרים לפי קטגוריה
function displayItems(category) {
    const itemsContainer = document.getElementById("items-container");
    if (!itemsContainer) return;
    itemsContainer.innerHTML = "";
    const filteredItems = items.filter(item => item.category === category);
    filteredItems.forEach(item => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "item";
        itemDiv.innerHTML = `
          <div class="product-img-wrapper">
            <img src="${item.pic}"/>
          </div>
            <p>${item.name}</p>
            <p class="title">${item.origin}</p>
            <p>${item.price}₪</p>
            <button onclick="addToCart('${item.name}', ${item.price}, '${item.pic}', '${item.origin}', '${item.category}')">הוספה לסל</button>
        `;
        itemsContainer.appendChild(itemDiv);
    });
}
document.addEventListener("DOMContentLoaded", loadItemsFromDB);

// Load items from IndexedDB when the page is ready
async function loadItemsFromDB() {
    items = await db.items.toArray();
    if (document.body.contains(document.getElementById("items-container"))) {
        const currentPage = window.location.pathname.split("/").pop();
        let category;
        if (currentPage === "redwines.html") category = "Reds";
        else if (currentPage === "whitewines.html") category = "Whites";
        else if (currentPage === "rosewines.html") category = "Roses";
        if (category) displayItems(category);
    }
}

//פונקציה להוספת מוצר לעגלה (משתמשים)
async function addToCart(name, price, pic, origin, category) {
    const existing = await db.cart.where("name").equals(name).first();
    if (existing) {
      existing.quantity += 1;
      await db.cart.put(existing);
    } else {
      await db.cart.add({ name, price, pic, origin, category, quantity: 1 });
    }
    showCartNotification();
  }
  
  // תצוגת חלון קופץ של עגלה
  async function showCartNotification() {
    const notification = document.getElementById("cart-notification");
    const cartItemsContainer = document.getElementById("cart-items");
    const totalCostElement = document.getElementById("total-cost");
  
    // עצירה מוקדמת אם האלמנטים לא קיימים
    if (!notification || !cartItemsContainer || !totalCostElement) return;
  
    let totalCost = 0;
    cartItemsContainer.innerHTML = "";
  
    const cart = await db.cart.toArray();
    cart.forEach((item) => {
      totalCost += item.price * item.quantity;
  
      const itemDiv = document.createElement("div");
      itemDiv.classList.add("cart-item");
      itemDiv.innerHTML = `
        <img src="${item.pic}" alt="${item.name}">
        <div class="cart-item-details">
          <p><strong>${item.name}</strong></p>
          <p>₪${item.price}</p>
          <p>${item.origin}</p>
          <p>
            <button onclick="changeQuantity('${item.name}', -1, 'popup')">-</button>
            <span>${item.quantity}</span>
            <button onclick="changeQuantity('${item.name}', 1, 'popup')">+</button>
          </p>
        </div>
      `;
      cartItemsContainer.appendChild(itemDiv);
    });
  
    totalCostElement.textContent = totalCost.toFixed(2);
    notification.classList.remove("hidden");
    notification.classList.add("visible");
}

//לחצן להסתיר הודעת הוספת מוצר לסלללל
async function hideNotification() {
    const notification = document.getElementById("cart-notification");
    notification.classList.remove("visible");
    notification.classList.add("hidden");
}
  
//הצגת נתונים בדף 'CART.HTML'
async function displayCart(mode = "full") {
    //אופציה נוספת:checkout
    const cart = await db.cart.toArray();
    const cartContainer = document.getElementById("cart-container") || document.getElementById("cart-items");
    if (!cartContainer) return;
  
    cartContainer.innerHTML = "";
    let totalCost = 0;
  
    cart.forEach(item => {
      totalCost += item.price * item.quantity;
  
      let buttonsHtml = "";
      if (mode === "full") {
        buttonsHtml = `
            <p>
            <button onclick="changeQuantity('${item.name}', -1, 'cart')">-</button>
            <span>${item.quantity}</span>
            <button onclick="changeQuantity('${item.name}', 1, 'cart')">+</button>
            </p>
            <button onclick="removeFromCart('${item.name}')" class="remove-btn" aria-label="הסר מהעגלה">
                <i class="fas fa-trash"></i></button>

        `;
      } else {
        buttonsHtml = `
          <p>x ${item.quantity} - <strong>₪${(item.price * item.quantity).toFixed(2)}</strong></p>
        `;
      }
      const itemDiv = document.createElement("div");
      itemDiv.classList.add("cart-item");
      itemDiv.innerHTML = `
        <img src="${item.pic}" alt="${item.name}">
        <div class="cart-item-details">
          <p><strong>${item.name}</strong></p>
          <p>₪${item.price}</p>
          <p class="title">${item.origin}</p>
          ${buttonsHtml}
        </div>
      `;
      cartContainer.appendChild(itemDiv);
    });
    // חישובי משלוח וסה"כ
    const totalAfterDiscount = totalCost - (typeof discount !== "undefined" ? discount : 0);
    const deliveryOption = document.querySelector("input[name='delivery']:checked");
    const deliveryFee = (!deliveryOption || deliveryOption.value === "shipping") && totalAfterDiscount < 250 ? 19.9 : 0;
    const finalTotal = totalAfterDiscount + deliveryFee;

    // הצגת סכומים אם קיימים
    document.getElementById("total-cost").textContent = `${totalCost.toFixed(2)}₪`;
    document.getElementById("delivery-fee").textContent = `${deliveryFee.toFixed(2)}₪`;
    document.getElementById("final-total").textContent = `${finalTotal.toFixed(2)}₪`;
}
  
//הסרת מוצר מסל קניות
async function removeFromCart(name) {
    const item = await db.cart.where("name").equals(name).first();
    if (item) {
      await db.cart.delete(item.id);
      displayCart(); // רענון תצוגה
    }
}
//קריאה לפונקציה של הצגת נתוני סל קניותתתת
  document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("cart-container")) {
      displayCart();
    }
});
    

// שינוי כמות מוצר בעגלה
async function changeQuantity(name, change, mode) {
    const item = await db.cart.where("name").equals(name).first();
    if (!item) return;
  
    item.quantity += change;
    if (item.quantity <= 0) {
      await db.cart.delete(item.id);
    } else {
      await db.cart.put(item);
    }
  
    if (mode === "cart") {
        displayCart(); // עגלה מלאה
    } else if (mode === "popup") {
        showCartNotification(); // הודעה קופצת
    }
}
  
  
  // טוען את ההודעה רק בדפים שבהם יש עגלה
document.addEventListener("DOMContentLoaded", () => {
    const relevantElement = document.getElementById("cart");
    if (relevantElement) {
      showCartNotification();
    } else {
      console.warn("הפונקציה לא נקראת. הכל טוב! לא נורא זו לא טעות");
    }
});
  

//רצף פונקציות לדף צ'אק אאוטטט
async function showStep(stepIndex) {
    const steps = document.querySelectorAll(".checkout-step"); // Form steps
    const stepIndicators = document.querySelectorAll(".step"); // Step titles
    // Update form visibility
    steps.forEach((step, index) => {
        step.classList.toggle("active", index === stepIndex); // Show only the active form
        step.classList.toggle("hidden", index !== stepIndex); // Hide other forms
    });
    // Update step indicator visibility
    stepIndicators.forEach((indicator, index) => {
        indicator.classList.toggle("active", index === stepIndex); // Highlight the active step title
    });
}

async function handleSignup(event) {
    event.preventDefault();
    const newUsername = document.getElementById("new-username").value;
    const newPassword = document.getElementById("new-password").value;
    const newEmail = document.getElementById("new-email").value;
  
    if (await db.users.get(newUsername)) {
        alert("שם המשתמש כבר קיים!");
        return;
    }
    await db.users.put({ username: newUsername, password: newPassword, email: newEmail });
    await db.session.put({ key: "currentUser", username: newUsername, email: newEmail});
  
    const mode = getRedirectMode(); // homepage או checkout
    const popup = document.getElementById("new-user-popup");
    if (popup) popup.classList.remove("hidden");
    document.getElementById("close-popup").addEventListener("click", () => {
        popup.classList.add("hidden");
        if (mode === "checkout") {
            window.location.href = "checkOut.html?step=1"; // נשלח אותו חזרה לצ'קאאוט
        } else {
        window.location.href = "homepage.html";}
    });
}
  

async function handleLogin(event, mode = "homepage") {
    event.preventDefault();
  
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
  
    const user = await db.users.get(username);
    if (user && user.password === password) {  
      await db.session.put({ key: "currentUser", username, email: user?.email });
      if (username === "Manager123" && password === "Manager123") {
        window.location.href = "admin.html";
      } else if (mode == "checkout") {
        //window.location.href = "checkOut.html";
        showStep(1);//לדלג ישר לשלב הבאאאאא
      }else{
        window.location.href = "homepage.html";}

    } else {
      alert("שם משתמש או סיסמה שגויים.");
      document.getElementById("username").value = "";
      document.getElementById("password").value = "";
    }
}
  
//ברגע שמשתמש יוצא- הנתונים שלו נמחקים בסשן הנוכחי
async function logout() {
    await db.session.clear();
    await db.cart.clear();
    window.location.href = "homepage.html";
}
  
//בודקת אם המשתמש מחובר וככה יודעת אם להעביר אותו ישירות לשלב הבא בצאק אאוטטט
async function checkLoginStatus(options = {}) {
    const session = await db.session.get("currentUser");
  
    if (session) {
      console.log("משתמש מחובר:", session.username);
      if (options.redirectIfLoggedIn) {
        window.location.href = options.redirectIfLoggedIn;
      }
    } else {
      console.log("אין משתמש מחובר");
      if (options.redirectIfNotLoggedIn) {
        window.location.href = options.redirectIfNotLoggedIn;
      }
    }
}
 

//ניצור מוצרי בסיס שיהיו קיימים ברגע שנריץ את האתר.
async function populateDefaultData() {
  // בדיקה אם כבר יש מוצרים
  const existingItems = await db.items.toArray();
  if (existingItems.length === 0) {
    await db.items.bulkAdd([
      {name:"ברקן קלאסיק קברנה", category:"Reds", price: 35.9, pic:"imgs/reds/brkn.png", origin:"גליל עליון, ישראל"},
      {name:"יין אדום שאטו", category:"Reds", price: 50, pic:"imgs/reds/cha_car.jpg", origin:"ייקבי כרמל, ישראל"},
      {name:"מונטרו קיאנטי", category:"Reds", price: 59.9, pic:"imgs/reds/chi.jpg", origin:"טוסקנה, איטליה"},
      {name:"קברנה סוביניון ירושליים", category:"Reds", price: 55, pic:"imgs/reds/cs_jer.jpg", origin:"יקב ירושליים, ישראל"},
      {name:"יין אדום יבש של סגל", category:"Reds", price: 21.9, pic:"imgs/reds/dry_seg.png", origin:"שפלת יהודה, ישראל"},
      {name:"אסמבלאז איתן", category:"Reds", price: 65, pic:"imgs/reds/itan_brkn.png", origin:"שפלת יהודה, ישראל"},
      {name:"דלתון כנען אדום", category:"Reds", price: 50, pic:"imgs/reds/KNAAN_red.png", origin:"גליל עליון, ישראל"},
      {name:"לוטם אדום 2021", category:"Reds", price: 85, pic:"imgs/reds/ltm.jpeg", origin:"הר מירון, ישראל"},
      {name:"יין אדום יבש נטע", category:"Reds", price:70, pic:"imgs/reds/neta.jpg", origin:"ייקבי נטע, ישראל"},
      {name:"יין אדום סטה ויניה", category:"Reds", price:75, pic:"imgs/reds/vin_itly.jpg", origin:"איטליה"},
      
      {name:"גוורצטרמינר ריזלינג- בלו נאן", category:"Whites", price:51.9, pic:"imgs/whites/blue_nan.png", origin:"גרמניה"},
      {name:"גוורצטרמינר ספיישל רזרב", category:"Whites", price:70, pic:"imgs/whites/g_s_r.png", origin:"גליל עליון והרי ירושלים"},
      {name:"יין לבן חצי יבש של סגל", category:"Whites", price:21.9, pic:"imgs/whites/h_dry_sgv.png", origin:"שפלת יהודה, ישראל"},
      {name:"עברי שרדונה", category:"Whites", price:55, pic:"imgs/whites/hebrew_s.png", origin:"ישראל"},
      {name:"מאד האוס סוביניון בלאן", category:"Whites", price:74.9, pic:"imgs/whites/mh_sb.png", origin:"ניו זילנד"},
      {name:"יין לבן הר חרמון", category:"Whites", price:37.9, pic:"imgs/whites/mnt_her.png", origin:"רמת גולן, ישראל"},
      {name:"יין לבן שרדונה קלאסיק", category:"Whites", price:35.9, pic:"imgs/whites/srdn_brkn.png", origin:"גליל עליון והרי ירושלים"},
      {name:"טורס דה אספניה בלאנקו", category:"Whites", price: 44.9, pic:"imgs/whites/tte_b.png", origin:"ספרד"},

      {name:"יין רוזה חצי יבש", category:"Roses", price:50, pic:"imgs/roses/rose2-2020.png", origin:"ייקבי ישראל, ישראל"},
      {name:"יין רוזה חצי יבש- 2016", category:"Roses", price:50, pic:"imgs/roses/rose2016.png", origin:"ייקבי ישראל, ישראל"},
      {name:"יין רוזה יבש", category:"Roses", price:50, pic:"imgs/roses/rose2020.png", origin:"ייקבי ישראל, ישראל"},
      {name:"שאטו טרבון פרובנס רוזה", category:"Roses", price:79.9, pic:"imgs/roses/ting_rose.png", origin:"צרפת"},
      {name:"יין הר חרמון רוזה", category:"Roses", price:37.9, pic:"imgs/roses/hrmn_rose.png", origin:"רמת הגולן, ישראל"},
      {name:"עברי רוזה", category:"Roses", price:55.9, pic:"imgs/roses/hebrew_rose.png", origin:"ישראל"},
      {name:"יין רוזה אימפרשן", category:"Roses", price:51.9, pic:"imgs/roses/trpc_rose.png", origin:"עמק אילון, ישראל"},
      {name:"רוזה רזרב גולד ברקן", category:"Roses", price:50, pic:"imgs/roses/rsrv_brkn_rose.png", origin:"כרם עלמה, גליל עליון"},
    ]);
  }

  // בדיקה אם יש משתמש admin
  const adminExists = await db.users.get("admin");
  if (!adminExists) {
    await db.users.put({
      username: "Manager123",
      password: "Manager123",
      email: "Manager123@wine.com"
    });
  }
}
document.addEventListener("DOMContentLoaded", async () => {
  await populateDefaultData();
});
