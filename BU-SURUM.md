# Bahis, mağaza ve güç efektleri — teslim durumu

UYGULANDI
- Asker/dolar kaydırıcıları, %25/50/75/100 hazır bahisleri, aynı sekmede son bahis, dinamik +2 çarpan formülü.
- Çifte kazanç, eksi koruma, kasa kilidi rozetleri. Zar atmadan geç hamleyi bitirir.
- Bahis paneli odaktayken sol/sağ 1, Shift+sol/sağ 5; sayı girişleri dışında 1–4 hazır bahis ve R son bahis; Enter zar. Sayı alanında normal rakam yazımı korunur.
- 44 px dokunma kontrolleri, temaya bağlı renkler, kabartmalı paneller ve büyük sandık görünümünde Cephanelik düğmesi.
- Sunucu güç olaylarına kaynak/hedef ve gerçekten kaldırılan kareler eklendi. Hasar/ekonomi formülleri değiştirilmedi.
- Ordu/para takas okları, çalma para akışı, zehir alevi, UFO/çekim konisi, can-kalkan halkası, blok ve x2 göstergeleri, çizimli füze gövdesi/kuyruğu.

SINIRLAR
- UFO ışın konisi var; tüm ordunun ayrıntılı sprite animasyonuyla gemiye çekilmesi tamamlanmış değil.
- General modelleri ve portreleri hâlâ üretim görselleri değil. Yedi dünyadaki canlılar ve çevre modelleri eksik.
- Clash oyunlarının sanat kalitesine ulaşıldığı iddia edilmiyor; arayüz iyileştirmesi var, bütün sanat paketi tamamlanmış değil.
- Metindeki Screenshot_3.png ayrıca verilmedi; kontrol metni uygulandı, ekran görüntüsüyle piksel eşleştirmesi yapılmadı.
- Blender MCP 'Could not connect to Blender' döndü. Tarayıcı localhost kontrolü zaman aşımına uğradı. Ses dinleme/mobil gerçek cihaz kontrolü yapılmadı.
- 54 otomatik test geçti; Canvas testleri çizim bağlamı taklididir.

MODEL İÇİN SOMUT YOL
1. Resmî kaynak: https://quaternius.com/packs/ultimatedanimatedcharacter.html — sayfa 52 animasyonlu model, FBX/OBJ/Blend ve CC0 bildiriyor. Bu eski paketin lisansını yeni paketlere genelleme.
2. Resmî düğmenin açtığı klasör: https://drive.google.com/drive/folders/1sNi1AfenfPRrvRt5yfaj5QMMd6KKcUJ5 . Bu turda indirilmedi; uygulanmış varlık sayılmaz.
3. Bu paket arketip tabanı olabilir; kullanıcının tarif ettiği on karakterin tam eşleşmesi değildir. Uygun karakterler seçilip eksik kıyafet ve siluetler hazırlanmalı.
4. Blender açık ve MCP eklentisi çalışır hâle gelmeli. Alternatif olarak paketten aynı açıdaki şeffaf sprite atlasları hazırlanıp doğrudan public/assets içine konulabilir.
5. Önce tek generalin bekleme/hasar/yerleşme animasyonunu gerçek oyunda onayla; ardından diğer dokuz karakteri aynı ışık, kamera ve ölçekle üret. İkon ve portre aynı modelden render edilmeli.
6. Robot, astronot ve korsan için farklı paketlerden rastgele görselleri birlikte kullanmak yerine ortak malzeme/ışık işlemi uygula. İstenen tüm karakterler ücretsiz aynı pakette bulunmuş değildir. Ücretli satın alma yapılmadı.

DAĞITIM
ZIP'i çıkar; içindeki dosyaları ve public/tests klasörlerini GitHub depo kökünde güncelle. .data paylaşma. Commit sonrası Render Manual Deploy > Deploy latest commit; sonra Ctrl+F5. Önce ayrı deneme dağıtımında kontrol et. Mevcut üretim varlıkları tamamlanmadığından bu paket tam sanat teslimi değildir.
