# Generated manually for making snippet_mp3 optional

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('beats', '0004_userprofile'),
    ]

    operations = [
        migrations.AlterField(
            model_name='beat',
            name='snippet_mp3',
            field=models.FileField(blank=True, null=True, upload_to='snippets/'),
        ),
    ]
