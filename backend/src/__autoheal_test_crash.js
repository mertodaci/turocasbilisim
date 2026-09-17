// AUTO-HEAL TEST DOSYASI - kasitli olarak fırlatıyor.
// Bu commit, /root/turocasbilisim_deploy.sh'daki auto-heal mekanizmasini
// canli olarak test etmek icin bilerek eklendi ve otomatik olarak
// revert edilmesi beklenmektedir. Elle silmeyin/duzeltmeyin - auto-heal
// bunu kendi halletmeli.
throw new Error('AUTO-HEAL TEST: kasıtlı çökme, ' + new Date().toISOString());
