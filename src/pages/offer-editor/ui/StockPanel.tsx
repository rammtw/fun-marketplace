import { useState } from 'react';
import { readItems } from 'pages/offer-editor/lib/attribute-schema';
import { addStock } from 'shared/api';
import type { SellerOfferView } from 'shared/api';
import { Alert } from 'shared/ui/Alert';
import { Button } from 'shared/ui/Button';
import { TextArea } from 'shared/ui/TextArea';
import styles from './OfferEditorPage.module.css';

interface StockPanelProps {
  offer: SellerOfferView;
  onAdded: (offer: SellerOfferView) => void;
}

/**
 * Остаток есть только у товара с автовыдачей. Единицы добавляются и не
 * удаляются: выданная покупателю единица уже его.
 */
export function StockPanel({ offer, onAdded }: StockPanelProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [added, setAdded] = useState(0);
  const [pending, setPending] = useState(false);

  async function handleAdd() {
    const items = readItems(text);
    setError(null);
    setAdded(0);

    if (items.length === 0) {
      setError(new Error('Добавьте хотя бы одну единицу — по одной в строке.'));
      return;
    }

    setPending(true);
    try {
      onAdded(await addStock(offer.id, items));
      setAdded(items.length);
      setText('');
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(String(cause)));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <h2 className={styles.title}>Остаток</h2>
        <span className={styles.hint}>свободно: {offer.stock ?? 0}</span>
      </div>
      <p className={styles.subtitle}>
        Ключи, коды или связки логин/пароль — по одной штуке в строке.
      </p>

      <div className={styles.form}>
        <TextArea
          label="Новые единицы"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={'KEY-1111-2222\nKEY-3333-4444'}
        />
        {error ? <Alert tone="error">{error.message}</Alert> : null}
        {added > 0 ? <Alert tone="success">Добавлено единиц: {added}.</Alert> : null}
        <div className={styles.actions}>
          <Button onClick={handleAdd} disabled={pending}>
            {pending ? 'Добавляем…' : 'Пополнить остаток'}
          </Button>
        </div>
      </div>
    </section>
  );
}
