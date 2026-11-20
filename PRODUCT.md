# Kare Oyunu

Mobil ve masaüstü tarayıcılar için 2–6 kişilik sıra tabanlı alan stratejisi. Tek oyunculu giriş bir oda kurar ve iki bot ekler. Arkadaşlar altı haneli kodla aynı odaya katılır. Her oyuncu altı general arasından uygun olanı ve sunulan üç güçten ikisini seçer.

Oyuncu 50 × 50 karede ordusunu büyütür. İlk beş tur barış, altıncı turdan itibaren savaş vardır. Hamle süresi 45 saniyedir. Çark sonucu, kasa, birlikler ve güç kullanımları sunucudan gelir. Maç günlüğü ve yönetici testi bu durumla birlikte çalışır.

Kullanıcının seçtiği dünya “Renkli fantastik arena”. Menüden maça hızlı geçiş, dokunmatik ekranda görünür tahta ve hamle sonucunu ekran üzerinde okumak tasarımın öncelikleridir.

## Bilgisayarda çalıştırma

ZIP içeriğini bir klasöre aç. Node.js 22 veya üzeri kurulu bilgisayarda, bu klasörde `npm start` komutunu çalıştır ve tarayıcıda `http://localhost:3000` adresini aç. İki bota karşı giriş için **Meydana çık** düğmesini kullan. Aynı yerel ağdaki telefondan oynamak için bilgisayarın yerel ağ adresini ve aynı bağlantı noktasını aç. Arkadaşlarla oyunda herkes aynı sunucuya girer ve oda kodunu kullanır.

## Yönetici ve tema yaması

Özel giriş için oyun adresine `#komutan-girisi` ekle ve görünen Yönetici düğmesine bas. Windows'ta özel deneme sunucusu için **Yonetici Baslat.cmd** dosyasını çalıştır. Canlı site kurulumu ve paneldeki işlemler **YONETICI-TESTI.md** dosyasındadır.

**Kare-Oyunu-Yedi-Dunya-Yamasi.zip** isteğe bağlıdır. ZIP'i ana oyun klasörüne açtığında **Dünyalar** düğmesi görünür. Depodan `public/worlds` klasörünü kaldırıp yeniden dağıttığında bu düğme de kalkar. Temel oyunun hareketli kıyısı ana pakete dahildir.
