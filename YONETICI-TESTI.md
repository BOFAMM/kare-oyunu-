# Çark ve yönetici testi

CS2 tarzında kayan kart şeridi yeniden kullanılıyor. Merkez işaretçisi sabit kalır. Kartlar hız keser ve sunucunun belirlediği sonuç, işaretçinin altında vurgulanır. Oyuncular ve botlar aynı gösterimi kullanır.

## Yönetici panelini aç

PowerShell veya terminalde sana ait rastgele anahtarı üret:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Render servisinde **Environment → Add Environment Variable** seç. Ad olarak `GAME_ADMIN_KEY`, değer olarak ürettiğin 64 haneli anahtarı ekle ve dağıt. Anahtarı GitHub dosyalarına, oyun adresine veya sohbete yazma. Anahtar yoksa veya biçimi geçersizse sunucu yönetici API'sini kapalı tutar.

Yerel PowerShell oturumunda aynı ayar `$env:GAME_ADMIN_KEY = 'ANAHTARINI_BURAYA_GIR'` şeklinde yapılır. Sonra o terminalden `node server.mjs` çalıştırılır. Yeni değer için sunucu yeniden başlatılır.

Ana menüde veya maçın üst çubuğunda **Yönetici** düğmesini aç. Alternatif olarak oyun adresinin sonuna `?test=1` ekle veya oyun açıkken **Ctrl+Shift+K** tuşlarına bas. HTTPS yayımlanan oyunda, HTTP ise yerel bilgisayarda kullanılabilir. Anahtarı panelde gir. Girişten sonra üstteki **Test paneli** düğmesiyle oyunu kapatmadan panele geri dön. Anahtar yalnızca açık sekmenin belleğindedir. Yenileme veya yönetici çıkışı yeniden giriş gerektirir.

## Hızlı test

- Odayı ve oyuncuyu seç.
- **Sonucu sıraya al** ile o oyuncunun bir sonraki geçerli dönüşünde +1, −1, +2, −2, +5, −5 veya +10 kullan. Botlar da desteklenir. Geçersiz bahis sıradaki sonucu harcamaz. Sonuç tek seferliktir. **Rastgeleye dön** ile iptal edebilirsin.
- **Test ayarlarını uygula** ile turu, kasayı, yeni asker hakkını, mevcut general canını ve eklenecek gücü ayarla. General can alanını boş bırakırsan mevcut değer korunur.
- **Sırayı bu oyuncuya ver** seçilen canlı oyuncunun hamlesini başlatır. Önceki oyuncunun bekleyen işlemleri normal hamle bitirme kurallarıyla tamamlanır.
- **Sırayı / aşamayı ilerlet** güç seçimi, yerleşim, geri sayım veya aktif hamlenin süresini sona erdirir. Otomatik yerleşim adımı varsa ilerler.
- Yönetici testiyle belirlenen sonuç, çarkta ve maç günlüğünde **Yönetici testi** olarak görünür. Ayarlar seçilen odayı etkiler. Sıraya alınmış sonuçlar sunucu yeniden başlatıldığında ve rövanşta sıfırlanır.

Render ortam değişkenleri kılavuzu: https://render.com/docs/configure-environment-variables

Windows üzerinde **Yonetici Baslat.cmd** ayrı bir yerel test sunucusu açar. Anahtar panoya kopyalanır. Girişte yapıştır, ardından panonu temizle. Açılan terminali kapatınca yerel sunucu durur. Her başlangıçta yeni anahtar üretilir. Canlı sunucunun anahtarı bu işlemden bağımsızdır.

## Tekrar edilebilir maç deneyi

Bir oda ve oyuncu seç, maç başladıktan sonra **Kontrol noktası al** düğmesine bas. Kalkan, çifte kazanç ve kayıp korumasını ayrı ayrı açıp kaldırabilirsin. Güç listesinden herhangi bir kartı normal kullanım sayısıyla verebilirsin. Tur 3 güçlerin, tur 6 rakibe karşı savaş güçlerinin açıldığı ilk turdur. **Zarı tekrar aç** seçilen aktif oyuncuya tekrar bahis imkânı verir. Mevcut kayıp seçimini önce tamamla. **Kontrol noktasına dön** bütün odanın tahtasını, envanterini, sırasını, kaynaklarını ve sıraya alınmış zarlarını kayıt anına döndürür. Bu işlem bütün katılımcıları etkiler. Her oda için tek kontrol noktası sunucu belleğinde tutulur.

**Oyuncu adına hamle dene** bölümünde seçtiğin oyuncunun sırasındayken panelden doğrudan güç kullanabilir, satın alabilir, X/Y ile saldırı, iyileştirme ve yerleştirme deneyebilir, asker alabilir, kazanç çevirebilir ve zar atabilirsin. Yalnızca seçilen hamlenin alanları açılır. İşlemler normal maçın kaynak, sıra ve hedef kurallarını kullanır.
