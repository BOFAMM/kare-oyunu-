# Yedi Dünya, On Komutan — Görsel Üretim ve AI Yerleştirme Rehberi

Bu belge üretim hedefidir. Altındaki durum listesi hangi parçaların gerçekten uygulandığını ayırır. Detaylı model/rig/sprite üretimi ile kodla çizilen bir şekil aynı teslim değildir.

## Ortak sanat yönetimi

Sabit izometrik kamera; yarı gerçekçi, keskin siluetli, malzeme dokusu görünür askerî fantezi. Takım renklerini çevre paletinden bağımsız tut. Harita zemini düşük kontrastlı, karakterler orta kontrastlı, eylem göstergeleri en yüksek kontrastlı olmalı. Dekorlar 50×50 oyun alanına basmamalı, tıklamayı engellememeli. General ayak izi tek hücre kalırken ekrandaki boyu askerin yaklaşık 1,5–1,8 katı olabilir. Siluetin büyümesi menzil veya hücre sayısını değiştirmez.

Üretilecek arka planlar katmanlı olmalı: uzak atmosfer, orta uzaklık objeleri, ada altı, oynanabilir zemin, karakterler, çevre parçacıkları ve HUD. Bütün sahneyi tek resme dönüştürmek yakınlaştırmada kaliteyi ve hedeflemeyi bozar. Tek bir devasa 8K görsel yerine yeniden kullanılabilir dokular ve atlaslar tercih edilmeli. Piksel ölçüleri hedef cihazda ölçülerek belirlenmeli; HD etiketi performans garantisi değildir.

## 1. Kor Denizi — volkanik dünya

Palet: obsidyen #17181C, bazalt #34363A, kül #777B80, kor turuncusu #FF681F, derin lav #8E230C, kızgın merkez #FFD17A.

Oynanabilir kareler soğumuş lav plakalarıdır. Kenarlar düzensiz mineral çizgiler taşır fakat hücre sınırlarını gizlemez. Turuncu çatlaklar her karede aynı parlaklıkta olmamalı; seyrek dağıtılmalı. Ada çevresinde ağır akan koyu kırmızı lav, yüzeyinde kısa ömürlü turuncu damarlar ve küçük kabarcıklar görülür. Isı kırılması yalnızca çevrede uygulanır; askerler ve hedefleme metinleri bulanıklaşmaz.

Lav köpekbalıkları gri kayadan oyulmuş zırhlı canlılardır. Sırtlarında soğuk bazalt plakalar, plakaların arasında turuncu yarıklar bulunur. Yüzeyde önce sırt yüzgeci, sonra kısa süre gövde görünür; kuyruk vuruşu lavda ince bir iz bırakır. Bu canlılar yalnızca dekoratif çevre rotalarında dolaşır. Metal korsan tekneleri koyu dövme demir gövdeli, perçinli, zincirli ve kızgın ışığı yansıtan araçlardır. Ahşap geminin rengi değiştirilmiş hali gibi görünmemeli. İki farklı boy, üç rota ve düşük frekanslı yalpa tekrar hissini azaltır.

Gerekli varlıklar: bazalt zemin/dikey kaya kenarı, lav dokusu, kabarcık atlası, kaya köpekbalığı yüzme döngüsü, iki metal gemi, duman ve kor parçacıkları.

## 2. Gökyüzü Tersanesi — teknolojik uçan ada

Palet: seramik beyaz #EEF9FF, soğuk panel #C9E8F4, elektrik mavisi #17BAFF, çelik #354B65, gökyüzü #6B9CCE.

Ada, üstü modüler beyaz seramik panellerle kaplı büyük bir hava platformudur. Alt yüzeyinde bakım kapakları, metal kirişler, kablolar ve dört büyük roket motoru bulunur. Motorlar mavi-beyaz çekirdekli, saydam dış alevli çalışır. Hareket birkaç piksel ve yavaş olmalı; kamera, çizim ve tıklama dönüşümleri aynı ada hareketini kullanmalıdır. Yalnızca resmi oynatıp tıklama ızgarasını sabit bırakmak yasaktır.

Bulutlar üç derinlikte ilerler. Uçan otomobiller metalik gövdeli, küçük itki ışıklı ve tekerleksiz bir siluet taşır. Uçaklar otomobillerden daha yüksek ve yavaş görünen uzak katmandan geçer. Giriş-çıkış rotaları oynanabilir alanın kenarlarından dolaşır. Her araç ekran dışında doğar ve ekran dışında kaldırılır; sürekli yeni nesne biriktirilmez.

Gerekli varlıklar: platform alt gövdesi, motorlar, alev döngüsü, iki hava otomobili, bir uçak, saydam bulut atlası ve panel malzemesi.

## 3. İnci Bulutları — fantastik uçan ada

Palet: inci #FFF9FC, açık pembe #F2B8D0, gül vurgusu #DD86B1, yumuşak yeşil #B8D9BA, gökyüzü #B8CCD9.

Bu ada bir uzay istasyonu değil; beyaz taş ve canlı köklerden oluşan, altından kristal sarkıtlar uzanan kadim bir bahçedir. Yeşil yalnızca sarmaşıklar ve küçük yaprak motiflerinde kullanılır. Büyük pembe alanlar yerine ince çiçek ve işlemeler tercih edilir; oynanış yüzeyi sade kalır.

Beyaz ejderhaların kanat zarlarında çok açık pembe, boyun ve kuyruk zırhında yeşil damar motifleri vardır. Vücut kanat vuruşuyla hafifçe yükselir, kuyruk geriden takip eder. Ejderha tek PNG'nin sağa kaydırılmasıyla tamamlanmış animasyon sayılmaz: kanat, gövde ve kuyruk ayrı rig veya en az bir uçuş sprite döngüsü ister. Kuşlar küçük sürüler halinde uzak katmanda hareket eder. Tek tek kuşları yüksek detaylı yapmak gereksizdir; sürü formunun doğal değişmesi önemlidir.

## 4. Büyülü Koru — çevresi tamamen kara

Palet: koyu yosun #162D25, orman #385744, yaprak #628367, sihirli filiz #B9EC85, çiçek moru #A879C4.

Oyun alanı, dev ağaçların ortasında açık bir açıklıktır. Kenarlarda kalın kökler, yumuşak yosun, mantarlar, yapraklı eğreltiler ve büyük çiçekler bulunur. Merkez hücreleri kapatan yüksek ağaç kullanılmaz. Orman yoğunluğu görsel olarak kenarlara doğru artar.

Kelebekler küçük ve düzensiz yaylar üzerinde dolaşır, kanat vuruşları sürüklenme hızından bağımsızdır. Tilki bazen yürür, kısa süre koşar, kenardaki çalının arkasında kaybolur. Hayvanların oynanabilir alandan geçmemesi, asker sanılmaması gerekir. Çiçekler çok yavaş sallanabilir; sihir ışıkları nadir ve düşük opaklıklı olmalıdır.

## 5. Buz Tacı — buz dağları arasındaki savaş alanı

Palet: buz beyazı #E3F6FF, açık buz #B5D9E8, donuk mavi #668EA8, çatlak cam #61C8F1, gölge #354B66.

Çevre tamamen karadır. Merkez donmuş göl veya düz buz platosudur; çevresinde sivri buz dağları ve kar yığınları bulunur. Zemin çatlakları dekoratiftir, oyun hücrelerini bölmez. Beyaz general ve askerleri ayırmak için ayak altında koyu gölge ve takım çerçevesi gerekir.

Penguenler kısa adımlarla yürür, zaman zaman karın üstü kayar. Kutup ayıları daha ağır hareket eder; omuzları adımla yükselir, nefes buharı kısa aralıklarla çıkar. Ayı ve penguen aynı ölçekte olmamalı. Kar parçacıkları az sayıda tutulur; yoğun kar yağışı hedeflemeyi örtmemeli.

## 6. Kum İmparatorluğu — çöl açıklığı

Palet: sıcak kum #E3BF84, sıkışmış zemin #C79C63, kaya #A77A49, gölge #6A503A, kaktüs #527759, kumaş turkuazı #488D8D.

Merkezde düz ve sıkışmış bir alan; çevrede kum tepeleri, kuru taşlar, seyrek kaktüsler ve aşınmış yapılar. Yapılar farklı kültürleri rastgele karıştıran dekorlar olmamalı; tek bir özgün çöl uygarlığı dili seçilmeli. Kapı kemerleri, bez gölgelikler ve eski bir su kuyusu yeterli olabilir.

Develer uzun, yavaş yürüyüş döngüsüyle kenar rotalarında gezinir. Ayak temasında çok küçük kum kalkar. Kaktüsler rüzgârda ağaç gibi sallanmaz. Kum fırtınası yerine ara sıra geçen ince toz şeritleri kullanılmalı; sürekli sarı sis okunabilirliği bozar.

## 7. Yörünge Kalesi — uzay

Palet: derin uzay #080A20, platform #242C43, çelik mavi #36405C, iyon moru #AB91FF, yıldız #E7F0FF.

Merkezde ağır bir yörünge platformu, çevrede derinlik hissi veren az sayıda yıldız ve uzak gezegen ışığı bulunur. Uydular yavaş döner, panelleri farklı açılarda ışık alır. Roketler ekranın bir kenarından girip diğerinden çıkarken kısa itki izleri bırakır. Yıldızların tamamı aynı hızda kaymaz. Uzay boşluğunda bulut veya okyanus dalgası gösterilmez.

## On generalin üretim tanımı

Bütün karakterler yetişkin olarak tasarlanmalı. Referanslar tanınmış karakterlerin birebir kıyafet/portre kopyası değil, arketip ve atmosfer referansıdır. Her general için portre, tam boy izometrik sprite, boşta bekleme, yerleştirme, hasar ve yenilgi animasyonları gerekir. En az dört yön idealdir; sabit kamera için önce kameraya dönük ana yön üretilebilir.

1. Mira, kaşif: mavi gözlü, gri kot kısa şortlu, pratik botlu, örgülü saçlı yetişkin kadın. Özgün keşif kemeri ve yıpranmış kumaş detayları. Portrede göz rengi görünür; oyun içi küçük ölçekte siluet daha önemlidir.
2. Vera, gölge ajan: kızıl saç, siyah vücuda oturan taktik giysi, mat zırh parçaları. Göğüste marka veya bilinen kahraman logosu yok. İnce kırmızı dikişler karakteri ayırır.
3. Selene, büyücü: özgün çatallı metal taç, bordo ve koyu pembe katmanlı giysi, el çevresinde düşük yoğunluklu büyü ışığı. Taç silueti generalin seçimini kolaylaştırır.
4. Boran, demir korsan: iri omuzlar ve kaslı gövde, koyu metal omuzluk, aşınmış uzun palto, ağır botlar. Karanlık ifade; yüzü tamamen siyah gölgeye gömülmez.
5. Aras, gezgin kaptan: daha sıradan beden oranları, deri yelek, kuşak, ince örgüler ve özgün üç köşeli olmayan başlık. Bilinen aktörün yüzü kullanılmaz.
6. Atlas, robot: büyük segmentli gövde, çelik kaburga parçaları, mavi enerji çekirdeği. Eklemler insan hareketini taklit eder ama metal ağırlık hissi korunur.
7. Aren, şampiyon: yetişkin sarışın, kaslı erkek; üst gövde açık, omuz kemeri ve savaş eldiveni. Ten yüzeyi plastik gibi parlamamalı; abartılı vücut oranı yerine güçlü siluet.
8. Nova, astronot: beyaz çok katmanlı giysi, siyah vizör, göğüs kontrol paneli ve yaşam destek çantası. Takım rengi küçük görev işaretinde kalır.
9. Ruhan, aslan: insan gövdesine aslan başı değil, iri dört ayaklı aslan. Yele ve omuzlar güçlü; rütbe metal göğüs plakası veya zemin halkasıyla gösterilir. Ayak izi yine tek oyun hücresidir.
10. Cihan, sultan: büyük ve ağır siluet, işlemeli kaftan, tarih esintili sarık, metal kemer ve tören kılıcı. Belirli tarihî kişinin portresi olarak sunulmaz.

Normal askerlerin gövdesi, kıyafeti, ölçüsü ve animasyonu aynıdır. Yalnızca başlık/miğfer maskesi takım rengine boyanır. Birim zemini takım rengini koruyabilir. General kostümü sahibin kimliğine bağlıdır; eksi silmede rütbe başka kareye geçtiğinde kostüm de o generalde görünür.

## Güç animasyonlarının yönetmenlik planı

Kimlikler mevcut motorla eşleşmeli; kullanıcı listesinin sıra numarası doğrudan power ID değildir.

- ID 2, yer değişimi: iki ordunun merkezleri arasında ters yönlü oklar. Her okun kuyruğu kaynak takım rengi, ucu hedef renge geçer. Gerçek sahiplik sunucuda değiştirilir; animasyon tekrar sahiplik değiştirmez.
- ID 3, kese takası: iki oyuncunun para panelleri arasında ters yönlü altın akış ve takım renkli oklar; eski/yeni tutarlar okunur kalır.
- ID 4, zehir: hedef bölgelerde yeşil-mor alev, kıvrılan duman ve kısa kül efekti. Yalnızca sunucunun gerçekten kaldırdığı kareler yok edilir; köprü olarak kalan kareyi animasyonda silme.
- ID 5, füze: ekran üstünden hızlanan füze, gövde üzerinde metal detay ve sıcak kuyruk; 3×3 alanda darbe dalgası, küçük enkaz ve kısa duman. Birim başına 1 hasar değişmez. Görsel gelişti diye hasar veya alan büyümez.
- ID 6, ışınlanma: UFO kaynağa gelir, konik ışın açar; birliklerin görüntüsü yukarı çözülür ve yeni yerde yeniden oluşur. Sunucu ötelemesi tek sefer uygulanır. Görsel görüntü kopyaları tıklanamaz.
- ID 7, çeyrek pay: generalden rakibin kasa işaretine uzanan kısa gölge/enerji izi, paraların geri akışı. Generalin gerçek karesi değişmez.
- ID 8, pas: büyük yasak/geçiş engeli sembolü, hedef general portresi ve kısa tok ses. Lisanslı bir kart oyununun logosu kopyalanmaz.
- ID 9, çifte şans: altın ×2 kısa süre büyür, sonra bahis paneline rozet olarak yerleşir. Bu güç pozitif kazancı ikiye katlar; pozitif gelme ihtimalini artırmaz.
- ID 10, çelik yürek: tüm generallere can parçacıkları, göğüste ışık ve ♥20 bildirimi. Ekrandaki sayaç sunucudaki son canı göstermeli.
- ID 11, kasa kilidi: para ve güç simgelerinin üstünde kilit/çarpı; kalan koruma bilgisi panelde kalır.
- ID 12, şans kalkanı: büyük eksi işareti önünde tek yönlü kalkan belirir; reddedilen negatif darbe dışa dağılır.
- ID 1: kasaya giren kısa para ışığı. ID 13: gerçek kazanılan askerler için yarım pay akışı. ID 14: ince altıgen kalkan. ID 15: dizilim çizgileri ve taşınabilir asker vurgusu.

## Kaynaklar ve üretim hattı

Gerçekten indirilen: GGBotNet, Y2K Lava Texture, 1024×1024 PNG, CC0. Kaynak https://opengameart.org/content/y2k-lava-texture ; dosya https://opengameart.org/sites/default/files/y2k_lava_texture.png . Projede public/assets/lava.png. Lav çevresinde kullanılıyor. Kaynağın CC0 beyanı incelendi.

İncelenen ama indirilip oyuna entegre edilmeyen: Kenney Space Kit, 150 3D varlık, CC0; https://kenney.nl/assets/space-kit . Uzay araçlarının blok/model tabanı için uygundur. Kullanıcının istediği detaylı yarı gerçekçi sanat kalitesine tek başına eşdeğer değildir. 3D modeller Canvas'a doğrudan PNG gibi yüklenmez; Blender'da aynı kamerayla render almak veya 3D çizim katmanı gerekir.

Diğer karakterler ve hayvanlar için henüz doğrulanmış, indirilmiş, aynı stile uygun hazır paket yoktur. Genel bir mağaza linkini belirli modelin lisansı doğrulanmış gibi sunma. Satın alınacak her varlıkta ticari kullanım, webde dosya dağıtımı, türev üretimi ve atıf şartları kaydedilmeli. Bütçe izni olmadan satın alma yapılmaz.

AI yerleştirme sırası: kaynak ve lisans kaydı → varlık indirme → ölçü/yön/şeffaflık kontrolü → Blender veya görsel editörde ortak stil → atlas oluşturma → asset manifest → sunucu statik dosya erişimi → asenkron yükleme/fallback → oyun olayına bağlama → masaüstü ve mobil gerçek cihaz testi.

Dosya önerileri: assets/worlds/{theme}/terrain.png, island-side.png, background.webp; assets/actors/{actor}/idle.png, move.png; assets/generals/{id}/portrait.webp, idle.png, hit.png; assets/effects/{power}/atlas.png. Her atlas için frameWidth/frameHeight/fps/anchor/scale bilgisi. Rastgele karakter görsellerini tek bir CSS kutusuna sıkıştırmak üretim entegrasyonu sayılmaz.

## Bu çalışma turunun gerçek durumu

Uygulandı: yedi palet tanımı; maç başında üç rastgele tema seçeneği ve oy kaydı; çoğunluk/eşitlik çözümü; on general kimliği ve kare seçim kartları; standart asker gövdesi ve takım başlığı; webden indirilen lav dokusu; bütün güçler için temel simge geri bildirimi. Tema ve general seçimi mevcut 90 saniyelik güç seçimi ekranında birlikte çalışıyor; ardışık, ayrı oylama sonra general ekranı henüz tamamlanmış değil.

Tamamlanmadı: on HD karakter portresi/modeli; bütün tema dekorları ve hareketli canlılar; ada altı motorları; UFO çekme sahnesi; ayrıntılı para/ordu takası ve zehir yanması; gerçek tarayıcıda görsel/ses/mobil performans onayı. Mevcut general kartları isim/renk taslaklarıdır. Bu sürüm nihai sanat paketi olarak yayımlanmamalıdır.
