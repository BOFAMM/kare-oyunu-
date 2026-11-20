---
name: Kare Oyunu
description: Kare tabanlı fantastik strateji oyununun menü, maç ve mobil arayüz sistemi.
colors:
  night: "#101b21"
  panel: "#192a30"
  raised: "#21373c"
  line: "#42534f"
  ivory: "#fff3d5"
  muted: "#c0cbc2"
  gold: "#f4c775"
  jade: "#83e2bc"
  violet: "#d2b0ff"
  coral: "#ffa59b"
typography:
  display:
    fontFamily: "Erica, Arial Black, sans-serif"
    fontWeight: 400
    lineHeight: 1
  body:
    fontFamily: "Outfit, Trebuchet MS, sans-serif"
    fontSize: "15px"
    lineHeight: 1.5
surfaces:
  primary: "ember.webp"
  createRoom: "jade.webp"
  joinRoom: "amethyst.webp"
  frame: "frame.png"
spacing:
  compact: "8px"
  panel: "16px"
  section: "24px"
---

# Kare Oyunu

## Meydana giriş

Ana menü, havada asılı bir kale meydanıdır. Oyunun elf ve peri generalleri ön plandaki karelerde hareket eder. Taçlı **Kare Oyunu** adının altındaki **Meydana çık**, iki botla maç hazırlığını açar. **Oda kur** ve **Kodla katıl** arkadaşlarla oynamanın iki yoludur. Komutan adı sol üstteki portrede değiştirilir. Alt sıradaki üç madalyon generalleri, güç kitabını ve kuralları açar.

Maçta görsel ağırlık oynanabilir karelerde ve birliklerdedir. Dönüş sırası, kaynak miktarı ve seçilen güç oyuncunun bir sonraki kararını destekler. Tahtadaki çayır, taş izleri ve çiçekler görsel zemindir. Yerleştirme ve saldırı hesabı sunucudaki karelerden gelir.

## Renkler

| Kullanım | Renk ve ikinci işaret |
| --- | --- |
| Birincil eylem, sıra ve çark | Altın, oynat üçgeni veya sancak |
| Alan kazanımı ve iyileşme | Yeşim, katmanlı kare veya kalp |
| Özel güç | Menekşe, ilgili gücün kendi arması |
| Hasar ve kayıp | Mercan, kılıç veya kalkan, miktarla birlikte |
| Oyuncu aidiyeti | Seçili generalin paleti, birliğin sorgucu, kalkanı, karosu ve oyuncu satırındaki renk şeridi |

Uzun açıklamalar açık adaçayı tonunda, başlıklar sıcak fildişi rengindedir. Renkli bir işlemin adı, sonucu veya sayısı her zaman yazıyla da gösterilir.

## Yazı

Erica One, oyun adında kalın kontur ve kademeli gölgeyle kullanılır. Komut başlıkları ve tahtada beliren kısa hamle yazıları aynı karakteri taşır. Outfit, uzun güç açıklamalarını, oyuncu adlarını, oda kodunun altındaki etiketi ve sayıları küçük ekranda okunur tutar. Fontlar oyunun kendi sunucusundan yüklenir. Telefonda iki satırlı logonun üst satırı 59–88, alt satırı 46–67 piksel aralığındadır.

## Ekran düzeni

| Ekran | Yerleşim ve davranış |
| --- | --- |
| Ana menü | Masaüstünde oyun adı ve komutlar solda, karakterler ve kale sağdadır. 700 piksel ve altında başlık yukarı, oyun komutları alt bölüme yerleşir. Meydana çık tam genişliktedir. Diğer iki komut aynı satırı paylaşır. |
| Lobi | Oda kodu tek düğmeyle kopyalanır. Oyuncu listesi, bot ekleme ve başlangıç ayarı aynı yüzeydedir. |
| Hazırlık | Masaüstünde altı general yan yana görünür. Telefonda generaller iki sıra, üç güç kartı dikey liste oluşturur. Seçilen kartta onay işareti ve çerçeve birlikte görünür. |
| Maç | Masaüstünde solda ordular, ortada tahta, sağda hamle paneli yer alır. 860 piksel ve altında alt menüden Harita, Hamle veya Ordular seçilir. |
| Hedef seçimi | Haritadan hedef isteyen güç, general alımı ve iyileştirme komuta panelini kapatıp haritayı açar. Hedef açıklaması ve vazgeçme düğmesi üstte kalır. |
| Sonuç ve rövanş | Kazanan, tur, oyuncu bazında özet ve rövanş işlemi aynı sonuç penceresindedir. |

Mobil hamle paneli ekranın en fazla yüzde 59’unu kaplar ve kendi içinde kayar. Harita sekmesi bütün tahtayı kullanıma açar. Alt gezinme çubuğu cihazın güvenli alan payını içerir.

## Sahne katmanları

Menüde resimli manzara, on karelik bekleme animasyonu olan iki karakter, ışık parçacıkları ve HTML metni ayrı katmanlardır. ScrollCraft kaydırmada manzarayı ve birlikleri farklı hızlarda hareket ettirir. Odaya girildiğinde menü motorunun çalışması sona erer. Maçta zemin bir kez Canvas yüzeyine çizilir. Birliklerin ayak gölgeleri, takım karoları, general canı ve olay yazıları ayrı çizim adımlarıdır.

## Armalar ve dokular

Marka arması yükseltilmiş bir kareyi gösterir. Hızlı oyunun altın-kızıl yüzeyinde kılıç, oda kurmanın yeşim yüzeyinde kale, katılımın mor taşında kapı bulunur. Düğme yüzeyleri masaüstündeki PNG koleksiyonundan, ahşap panel çerçevesi ile taç ve rünler UIBundleFree atlaslarından alınmıştır. Güç kitabı, seçim ekranı, mağaza ve envanter aynı 15 güç armasını paylaşır.

## Oyun kontrolleri

- **Meydan komutları.** Oyuncu düğmenin simgesine, yazısına veya yüzeyine dokunabilir. Oda kodu alanı yalnızca Kodla katıl seçilince açılır.
- **Hamle paneli.** Kasa ve asker hakkı üsttedir. Bahis miktarı alan, sürgü veya yüzde düğmesiyle değiştirilebilir. Olası sonuçlar açılır bölümde incelenir. Çark, birlik yerleştirme, güçler, cephanelik ve turu bitirme aynı panelde bulunur.
- **Ekran yazısı.** Başlık, arma ve oyuncu veya miktar birlikte görünür. Sıra başlangıcı, fetih, rütbe, iyileşme ve kaynak işlemleri sunucu olaylarıyla tetiklenir. Yazı 260 milisaniyede girer. Olağan olaylar 1,2 saniye, güçler 1,85 saniye gösterilir. Filtre, aynı sunucu güncellemesinde eleme gibi önemli olaya öncelik verir.
- **Kare üstü geri bildirim.** Hızlı yerleştirme tek sunucu komutudur. Toplu hamlenin son karesinde gerçek toplam görünür. Peş peşe elle yapılan yerleştirmeler de 650 milisaniyelik aralık içinde birleştirilir.
- **Çark.** Sunucu sonucu ve istemci gösterimi aynı 1,9 saniyelik süreyi paylaşır. Oyuncunun 45 saniyelik hamle süresine gösterim süresi eklenir. Yönetici testinden gelen sonuç açıkça belirtilir.
- **Hareket tercihi.** Azaltılmış hareket modunda menü süzülmesi, parçacıklar ve yazı sıçraması kapanır. Çark doğrudan sonuç kartına geçer. Metin ve sunucu tarafındaki sonuç korunur.
- **Erişim.** Mod ve güç adları simgelerin yanında görünür. Simgeli üst çubuk düğmelerinin erişilebilir adları vardır. Yerel diyaloglar Escape ile kapanır. Haritada oklar ve Enter kare seçmeye, WASD gezinmeye yarar.
