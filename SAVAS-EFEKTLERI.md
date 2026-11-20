# Kare Oyunu | Savaş efektleri ve zar

20 Kasım 2026

Şans çarkı sabit merkez göstergeli kayan kart şeridi kullanır. Sonuç sunucuda belirlenir. Yönetici kurulumu YONETICI-TESTI.md dosyasında anlatılıyor.

General paleti takım karolarına, başlıklara, portrelere ve çekilme efektine uygulanır. Altı generalden her biri bir maçta bir takım tarafından seçilebilir. Normal birlikler aynı zırhlı mızrakçıyı kullanır. Sorguç, kalkan ve kumaş oyuncunun rengine boyanır. KayKit görselleri Canvas üzerinde 2D olarak çizilir. Sprite'ların el ve silah hareketi iskelet üzerinden yeniden yapılmadı.

Güç efektleri sunucu olaylarına bağlanır. Işın kapısı sahnesinde görünen formasyonun konumu görsel olarak taşınır. Zehir yalnızca motorun kaldırdığı kareleri yakar. Füze düşüşü ve çarpması ayrı ses/efekt zamanlarına sahiptir. Ekran bildirimleri kaynak ve hedef oyuncuyu ya da etkisini gösterir. Elf, peri ve füze kaynaklı düşüşlerde farklı darbe efektleri kullanılır. Ses düğmesi örnekleri ve mevcut sentez seslerini kapatır.

Ana menü sahnesinde yerel ScrollCraft motoru manzarayı ve karakterleri ayrı hareket ettirir. Maç içindeki efektler sunucu olaylarıyla başlar. Tahta, hareketli birlikler, parçacıklar ve okunabilir sonuç yazısı ayrı katmanlardır. ScrollCraft bir sayfa kaydırma aracıdır. Oyun içi kamera ve girişler için mevcut Canvas kullanılır.

## Varlıklar

- CraftPix elf ve peri sprite'ları, daha önce kullanıcı tarafından sağlanan iki masaüstü paketinden gelen mevcut karakter atlasları.
- KayKit Fantasy Weapons Bits 1.0, Kay Lousberg. Paketin License.txt dosyası CC0 bildiriyor. Kaynak modeller bow_A_withString, sword_B, staff_A, wand_A, shield_A ve spear_A. Blender 5.2 ile 256×256 şeffaf render alındı. https://www.kaylousberg.com/
- Stylized Hit FX ve Stylized Explosion FX, Binbun3D. İki paketin license.txt dosyaları CC0 bildiriyor. Darbe çekirdeği ve patlama halkalarının görsel yaklaşımı Canvas'a uyarlandı. Godot sahneleri ZIP'te bulunmaz. https://bun3d.com/
- FREE Retro Mecha SFX, Helton Yan, CC BY 4.0. Kaynak WAV'lar oyuna göre kısaltıldı ve mono Ogg olarak dönüştürüldü. https://heltonyan.itch.io/retro-mecha-sfx ve https://creativecommons.org/licenses/by/4.0/
  - impact.ogg → Mecha DAMAGED 1.wav
  - launch.ogg → Mecha FLYBY 1.wav
  - beam.ogg → Mecha LASER BEAM 1.wav
  - lock.ogg → Mecha MALFUNCTION 1.wav
  - charge.ogg → Mecha TURN ON - OFF 1.wav
  - step.ogg → Mecha LASER BEAM SHORT 1.wav
- Masaüstündeki Textures paketi LotPixel ahşap PBR dosyaları içeriyor. Ceviz stilinin damarı Canvas'ta üretildi. Kaynak doku web dağıtımında servis edilmez. https://www.lotpixel.com/terms_conditions
- Masaüstündeki glitch-game-background paketi statik JPG/AI/EPS içeriyor. Kaynak Freepik afişi dağıtım paketine konmadı. Yeni çark sonucu renkli, kısa bir damga animasyonu kullanır.

## Kurulum

ZIP'i aç. engine.mjs, server.mjs, package.json, public ve tests dosya/klasörlerini mevcut oyun deponun köküne yerleştir. public klasörünün alt yolları korunmalı. Sunucuyu yeniden başlatıp yeni maçta generalini seç. Barındırılan sürümde ilgili commit'i yeniden dağıt ve tarayıcıyı yenile.
