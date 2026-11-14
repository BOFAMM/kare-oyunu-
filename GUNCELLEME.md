# Oyun düzeltmeleri — 14 Kasım 2026

## Kullanım

Çalışan oyun: http://localhost:3000 . Açık oyun sekmesini Ctrl+F5 ile yenile.
Sunucu kapalıysa BASLAT.cmd dosyasını çalıştır. Aynı portta ikinci sunucu başlatma.

## Füze

- Hedef alanı ve önizlemesi 3×3 oldu. Hasar 9'dan 1'e indirildi.
- Atışı yapan oyuncunun tüm generalleri korunur. Kendi normal askerleri etkilenebilir.
- Rakip generalin canı bir azalır; bir canlı general saldırıyla ölebilir.
- Kalkan, barış dönemi, 3 kullanım hakkı ve önceki toprak bütünlüğü koruması devam eder. Bir birimin silinmesi kalan orduyu bölecekse önceki bütünlük kuralı gereği o silme uygulanmaz; son generalin ölümüyle eleme istisnadır.

## Eksi çarpanda manuel kayıp

- Dolar kaybı hemen uygulanır. Askerler hemen silinmez; silinecek miktar panelde gösterilir.
- Bir kareye tıklayarak veya sürükleyerek kendi birliklerini seçebilirsin. Kopmaya yol açan seçim reddedilir ve kaynak tüketmez.
- Generalin karesi seçilirse rütbesi ve mevcut canı aynı bağlı bölgedeki en yakın normal askere geçer. Yakınlık, ordu içindeki kenar komşuluğu adımlarıyla ölçülür. Eşit uzaklıkta sabit komşu sırası kullanılır.
- General sayısı korunur. İki general ve üç normal asker varsa en fazla üç birim silinir; sonuç iki bitişik general olabilir. Aradaki askerler yüzünden kayıp artık sıfıra düşmez.
- “Kalan kaybı otomatik tamamla”, hamleyi bitirme veya sürenin dolması aynı sunucu doğrulamalı silme yöntemini kullanır.
- Botlar aynı kurallarla siler. Bekleyen kayıp tamamlanmadan başka kaynak veya güç işlemi yapılamaz.
- General aktarımı zar kaybına aittir; zehir, hırsızlık, ışınlanma, iyileştirme ve savaşın kendi kuralları ayrı tutuldu. Önceki kayıtlar silinmedi; geçmişte kopmuş bölgeler kendiliğinden taşınmaz.

## Çarpan ve animasyon

- Kazanç: ×1 %40, ×2 %7,5, ×5 %2, ×10 %1. Kayıp: −×1 %40, −×2 %7,5, −×5 %2.
- Hesap mevcut çarpan hesabıdır: toplam bahis × pozitif çarpan yeni asker kazandırır; eksi çarpan kaynak bazında kayıp oluşturur. Kazançta bahis teminatı korunur.
- Dekoratif kartlar aynı olasılık tablosundan örneklenir; eşit sayıda yüz gösterilmez. Sunucunun belirlediği kazanan kart durma konumuna yerleştirilir. Kısa bir şeritte yüzdelerin birebir aynı sayıya denk gelmesi garanti edilmez.
- Normal hareket ayarında dönüş 7 saniye sürer. Başta hızlı, sonunda yavaş ilerler. Gösterge konumu değişir; sonuç kartının sol veya sağ kenarına yakın, ancak kartın içinde durur. Komşu kart sonucu değiştirmez.
- Kart geçiş sesleri görsel yavaşlamanın hesabıyla zamanlanır. Sonuçta bas ve kısa vurgu katmanlarından oluşan tok ses üretilir. Ses kapatma seçeneği korunur.
- Azaltılmış hareket tercihi açıkken uzun kayma yerine kısa gösterim kullanılır. Sunucu gösterim için 8,5 saniye ayırır; bu süre hamle hakkından düşülmez.

## Doğrulama

- `node --test tests/*.test.mjs`: **46 test geçti, 0 başarısız**.
- Tek sıra 10 birimde, 7 canlı generalin kullanıcı seçimiyle uçtan uca aktarılıp rakibe komşu tek birim olarak kalması sınandı.
- Beş birimde iki generalin 4 ve 19 canlarını koruyarak iki bitişik generale düşmesi sınandı.
- Köprü silme reddi, süre sonunda tamamlama, yetkisiz hücre seçimi, silme sırasında harcama engeli ve aktarım sonrası iyileştirme/ışınlanma/20 can gücü sınandı.
- Füze alanı, kendi generalinin korunması, kalkan ve 1 canlı rakip generalin elenmesi sınandı.
- 89.000 dekoratif kart örneğinde ağırlıklı dağılım; farklı ekran genişliklerinde gerçek sonuç kartının kenarında durma; giderek uzayan ses aralıkları sınandı.
- Önceki regresyon testleri ve 40 senaryoda toplam 12.000 bot işlemi kontrolü geçti.
- Ayrı test odasında gerçek HTTP akışı: 10 birim → 9 askerlik kayıp → manuel general aktarımı → otomatik kalan kayıp → 1 general. Test başarılı.
- Güncellenen sunucu başlatıldı; önceki oda kayıtlarının yedeği çalışma klasöründe tutuldu.

## Doğrulanmayanlar

Bu oturumda tarayıcı kontrol aracı kullanılamadığı için yeni animasyon gerçek tarayıcıda gözle incelenmedi; ses dinlenmedi. DOM testleri, animasyonun matematiksel kontrolleri ve HTTP testi bunların yerine görsel/işitsel onay olarak sunulmaz. Gerçek mobil cihaz ve internet üzerinden çok oyunculu test yapılmadı.
