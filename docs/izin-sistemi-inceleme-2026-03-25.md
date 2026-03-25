# Google Sheet İzin Sistemi İnceleme Notları (25 Mart 2026)

## Genel Değerlendirme
Sisteminiz çalışır bir MVP seviyesinde ve fonksiyonlar anlaşılır şekilde bölünmüş. Özellikle departman/çalışan filtreleme ve raporlama tarafı pratik tasarlanmış.

Aşağıdaki maddeler, güvenlik ve veri tutarlılığı açısından en kritik iyileştirme alanlarıdır.

## 1) Kritik Güvenlik Riskleri

### 1.1 Şifrelerin kod içinde düz metin tutulması
- `Code.js` içinde: `ADMIN_PASSWORD = "1234"`
- `WebApp.js` içinde: `WEBAPP_PASSWORD = "Open1234"`

**Risk:** Kodu gören herkes yetkili işlemleri yapabilir. Şifre değişimi dağıtım gerektirir.

**Öneri:** Şifreleri `PropertiesService.getScriptProperties()` üzerinden okuyun.

### 1.2 Web App erişimi `ANYONE`
- `appsscript.json` içinde: `"access": "ANYONE"`

**Risk:** Linke ulaşan herkes giriş ekranına gelir; zayıf şifre ile brute force riski artar.

**Öneri:** Mümkünse `DOMAIN`/`ANYONE_WITH_GOOGLE_ACCOUNT` seviyesine çekin.

### 1.3 API fonksiyonlarında token zorunluluğu tutarlı değil
- `apiLogin`, `apiCheckAuth` mevcut ama veri döndüren fonksiyonların çoğunda zorunlu auth kontrolü görünmüyor.

**Risk:** İstemci tarafı çağrı akışı manipüle edilirse yetkisiz veri erişimi olabilir.

**Öneri:** Tüm `api*` veri fonksiyonlarının başına ortak bir `requireAuth(token)` kontrolü ekleyin.

## 2) Veri Tutarlılığı / İş Kuralı Riskleri

### 2.1 İzin gün sayısı için limit/doğrulama eksikliği
- `saveLeave(data)` yalnızca satır ekliyor; kalan hak kontrolü yapmıyor.

**Risk:** Negatif kalan izin veya hatalı kullanım raporlanabilir.

**Öneri:** Kayıt öncesi `ANNUAL/SICK` için kalan gün validasyonu yapın; limit aşılıyorsa işlemi durdurun.

### 2.2 Tarih doğrulama eksikliği
- Başlangıç/Bitiş tarihi için `endDate >= startDate` kontrolü yok.

**Risk:** Veri kalitesi düşer, raporlar yanlış olur.

**Öneri:** UI ve server tarafında çift doğrulama ekleyin.

### 2.3 Dolu aralıkta satır taşması
- `getFirstEmptyRow` 8–40 arası doluysa `41` döndürüyor.

**Risk:** Şablon düzeni bozulabilir veya beklenmedik satıra yazılabilir.

**Öneri:** 8–40 doluysa hata verin veya arşiv/append stratejisi tanımlayın.

## 3) Operasyonel İyileştirmeler

### 3.1 Eşzamanlı yazımda kilit kullanımı yok
- Aynı anda iki kullanıcı izin eklediğinde çakışma olabilir.

**Öneri:** `saveLeave` içinde `LockService.getDocumentLock()` kullanın.

### 3.2 Merkezi hata logu yok
- Hatalar kullanıcıya dönüyor ama merkezi kayıtta sınırlı iz var.

**Öneri:** Kritik işlemlerde `console.error` + opsiyonel `LOGS` sayfasına satır yazın.

### 3.3 API tekrarları
- `Report.js` ve `WebApp.js` içinde benzer `api*Report` fonksiyonları var.

**Öneri:** Tek kaynak fonksiyonda toplayın; bakım kolaylaşır.

## Önceliklendirilmiş Aksiyon Planı
1. **P0:** Şifreleri Script Properties’e taşıma + güçlü şifre politikası.
2. **P0:** API endpoint’lerinde zorunlu token doğrulama.
3. **P1:** `saveLeave` için kalan hak ve tarih doğrulamaları.
4. **P1:** `LockService` ile eşzamanlılık koruması.
5. **P2:** Loglama ve kod tekrarlarının azaltılması.

## Kısa Sonuç
Sisteminizin temel kurgusu iyi; en büyük kazanç güvenlik sertleştirmesi ve izin kaydına iş-kuralı validasyonları eklemekten gelecek. Önce kimlik doğrulama/şifre yönetimini, ardından izin doğrulama katmanını güçlendirmenizi öneririm.
