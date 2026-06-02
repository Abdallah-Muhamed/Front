//   const currentUser = JSON.parse(localStorage.getItem("demo_user"));
        if (!currentUser) {
            // alert("يجب تسجيل الدخول كـ مزارع أولاً!");
            // window.location.href = "index.html";
        }

        // 2. إعداد البروفايل (أول حرف + الاسم)
        const farmerName = currentUser.username;
        document.getElementById("profileName").innerText = farmerName;
        document.getElementById("profileAvatar").innerText = farmerName.charAt(0);

        // 3. مفاتيح التخزين
        const FARMS_KEY = "demo_farms";
        const PRODUCTS_KEY = "demo_all_products";

        function getMyFarms() {
            let allFarms = JSON.parse(localStorage.getItem(FARMS_KEY)) || [];
            return allFarms.filter(f => f.farmerEmail === currentUser.email);
        }

        function getMyCrops() {
            let allProds = JSON.parse(localStorage.getItem(PRODUCTS_KEY)) || [];
            return allProds.filter(p => p.sellerEmail === currentUser.email);
        }

        // 4. رسم المزارع
        function renderFarms() {
            const myFarms = getMyFarms();
            document.getElementById("countFarms").innerText = myFarms.length;
            let html = "";
            myFarms.forEach(f => {
                html += `<div class="card">
                            <h3 style="color:#1a365d; margin-bottom:5px;">${f.name}</h3>
                            <p style="color:#666; font-size:14px;">📍 ${f.location}</p>
                         </div>`;
            });
            document.getElementById("farmsGrid").innerHTML = html || "<p style='color:#888;'>لا يوجد مزارع مضافة بعد.</p>";
        }

        // 5. حفظ المزرعة
        function saveFarm() {
            let fName = document.getElementById("farmName").value;
            let fLoc = document.getElementById("farmLocation").value;
            if(!fName || !fLoc) { alert("أكمل البيانات!"); return; }

            let allFarms = JSON.parse(localStorage.getItem(FARMS_KEY)) || [];
            allFarms.push({ name: fName, location: fLoc, farmerEmail: currentUser.email });
            localStorage.setItem(FARMS_KEY, JSON.stringify(allFarms));

            document.getElementById('farmModal').style.display = 'none';
            document.getElementById('farmName').value = "";
            document.getElementById('farmLocation').value = "";
            renderFarms();
        }

        // 6. رسم المحاصيل
        function renderCrops() {
            const myCrops = getMyCrops();
            document.getElementById("countCrops").innerText = myCrops.length;
            let html = "";
            myCrops.forEach(c => {
                // صورة افتراضية لو المزارع محطش صورة
                let imgSource = c.img ? c.img : 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200';
                html += `<div class="card">
                            <img src="${imgSource}">
                            <h4>${c.name}</h4>
                            <p style="color:#2e7d32; font-weight:bold;">${c.price} ج.م</p>
                            <span style="font-size:12px; background:#e8f5e9; color:#2e7d32; padding:2px 8px; border-radius:10px;">${c.category}</span>
                         </div>`;
            });
            document.getElementById("cropsGrid").innerHTML = html || "<p style='color:#888;'>لم تقم بعرض أي محاصيل بالسوق.</p>";
        }

        // 7. حفظ المحصول (ونشره في السوق)
        function saveCrop() {
            let cName = document.getElementById("cropName").value;
            let cPrice = document.getElementById("cropPrice").value;
            let cCat = document.getElementById("cropCategory").value;
            let cImg = document.getElementById("cropImg").value;

            if(!cName || !cPrice) { alert("يجب إدخال اسم وسعر المحصول!"); return; }

            let allProds = JSON.parse(localStorage.getItem(PRODUCTS_KEY)) || [];
            
            // إنشاء كود تعريفي (ID) فريد للمنتج الجديد
            let newId = Date.now(); 

            allProds.push({ 
                id: newId, 
                name: cName, 
                price: Number(cPrice), 
                category: cCat, 
                img: cImg, 
                sellerEmail: currentUser.email 
            });

            localStorage.setItem(PRODUCTS_KEY, JSON.stringify(allProds));

            document.getElementById('cropModal').style.display = 'none';
            alert("تم نشر المحصول بنجاح! سيظهر الآن للعملاء في الصفحة الرئيسية.");
            renderCrops();
        }

        // تشغيل الدوال عند فتح الصفحة
        window.onload = function() {
            renderFarms();
            renderCrops();
        };