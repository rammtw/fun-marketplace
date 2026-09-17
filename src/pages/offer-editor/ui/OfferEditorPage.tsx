import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  type AttributeDraft,
  buildAttributes,
  draftFromAttributes,
  readAttributeSchema,
  readItems,
} from 'pages/offer-editor/lib/attribute-schema';
import { offerStatus } from 'entities/offer';
import {
  ApiError,
  archiveOffer,
  createOffer,
  fetchGame,
  fetchGames,
  fetchMyOffers,
  updateOffer,
} from 'shared/api';
import type { DeliveryType, SellerOfferView } from 'shared/api';
import { parseAmountToMinor, useAsyncData } from 'shared/lib';
import { Alert } from 'shared/ui/Alert';
import { Badge } from 'shared/ui/Badge';
import { Button } from 'shared/ui/Button';
import { Select } from 'shared/ui/Select';
import { Spinner } from 'shared/ui/Spinner';
import { TextArea } from 'shared/ui/TextArea';
import { TextField } from 'shared/ui/TextField';
import { AttributeFields } from './AttributeFields';
import { StockPanel } from './StockPanel';
import styles from './OfferEditorPage.module.css';

export function OfferEditorPage() {
  const { id } = useParams<{ id?: string }>();
  const editing = id !== undefined;
  const navigate = useNavigate();

  const [offer, setOffer] = useState<SellerOfferView | null>(null);
  const [gameSlug, setGameSlug] = useState('');
  const [sectionId, setSectionId] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [delivery, setDelivery] = useState<DeliveryType>('manual');
  const [itemsText, setItemsText] = useState('');
  const [attributes, setAttributes] = useState<AttributeDraft>({});

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<Error | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  // Черновик через GET /api/offers/{id} не увидеть — он не опубликован,
  // поэтому правка берёт лот из списка своих.
  const mine = useAsyncData(
    (signal) => (editing ? fetchMyOffers(undefined, signal) : Promise.resolve([])),
    [editing],
  );
  const games = useAsyncData(
    (signal) => (editing ? Promise.resolve([]) : fetchGames(signal)),
    [editing],
  );

  useEffect(() => {
    if (!editing || !mine.data) {
      return;
    }

    const found = mine.data.find((item) => item.id === id) ?? null;
    setOffer(found);
    if (found) {
      setTitle(found.title);
      setDescription(found.description);
      setPrice(String(found.price.amount / 100));
      setDelivery(found.deliveryType);
      setAttributes(draftFromAttributes(found.attributes));
    }
  }, [editing, id, mine.data]);

  // Схема атрибутов лежит в карточке игры: у раздела лота её нет.
  const slug = offer?.section.gameSlug ?? gameSlug;
  const game = useAsyncData(
    (signal) => (slug === '' ? Promise.resolve(null) : fetchGame(slug, signal)),
    [slug],
  );

  const currentSectionId = offer?.section.id ?? sectionId;
  const section = game.data?.sections.find((item) => item.id === currentSectionId) ?? null;
  const fields = useMemo(
    () => readAttributeSchema(section?.attributeSchema as Record<string, unknown> | undefined),
    [section],
  );

  // Услугу автоматически не выдать: её оказывает продавец.
  useEffect(() => {
    if (!editing && section?.kind === 'service') {
      setDelivery('manual');
    }
  }, [editing, section?.kind]);

  const archived = offer?.status === 'archived';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setFieldErrors({});

    const minor = parseAmountToMinor(price);
    if (minor === null || minor <= 0) {
      setFieldErrors({ price: 'Цена в рублях, например 1500 или 1500,50.' });
      return;
    }

    const built = buildAttributes(fields, attributes);
    if (Object.keys(built.errors).length > 0) {
      setFieldErrors(built.errors);
      return;
    }

    setPending(true);
    try {
      if (editing && id) {
        // Атрибуты заменяются целиком: схема раздела описывает набор полей.
        setOffer(
          await updateOffer(id, {
            title,
            description,
            price: minor,
            attributes: built.attributes,
          }),
        );
        setSaved(true);
      } else {
        if (currentSectionId === null) {
          setError(new Error('Выберите игру и раздел.'));
          return;
        }

        const items = delivery === 'auto' ? readItems(itemsText) : [];
        if (delivery === 'auto' && items.length === 0) {
          setError(new Error('Товар с автовыдачей заводится вместе с единицами.'));
          return;
        }

        await createOffer({
          sectionId: currentSectionId,
          title,
          description,
          price: minor,
          deliveryType: delivery,
          attributes: built.attributes,
          items,
        });
        // Лот родился черновиком — публикуют его из списка.
        navigate('/my/offers');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(String(cause)));
    } finally {
      setPending(false);
    }
  }

  async function changeStatus(status: 'active' | 'paused') {
    if (!id) {
      return;
    }

    setError(null);
    setSaved(false);
    try {
      setOffer(await updateOffer(id, { status }));
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(String(cause)));
    }
  }

  async function handleArchive() {
    if (!id) {
      return;
    }

    setError(null);
    try {
      await archiveOffer(id);
      navigate('/my/offers');
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(String(cause)));
    }
  }

  if (editing && mine.error instanceof ApiError && mine.error.status === 401) {
    return <Alert tone="error">{mine.error.message}</Alert>;
  }

  if (editing && mine.loading) {
    return <Spinner label="Загружаем лот…" />;
  }

  if (editing && !offer) {
    return (
      <div className={styles.page}>
        <Alert tone="error">Лот не найден — либо его нет, либо он чужой.</Alert>
        <p>
          <Link className={styles.back} to="/my/offers">
            ← к моим лотам
          </Link>
        </p>
      </div>
    );
  }

  const status = offer ? offerStatus(offer.status) : null;

  return (
    <div className={styles.page}>
      <Link className={styles.back} to="/my/offers">
        ← к моим лотам
      </Link>

      <section className={styles.card}>
        <div className={styles.head}>
          <h1 className={styles.title}>{editing ? 'Правка лота' : 'Новый лот'}</h1>
          {status ? <Badge tone={status.tone}>{status.label}</Badge> : null}
        </div>
        <p className={styles.subtitle}>
          {editing
            ? (status?.hint ?? '')
            : 'Лот заводится черновиком: на витрину его выведет отдельная кнопка.'}
        </p>

        {archived ? (
          <Alert tone="info">
            Лот в архиве: он больше не правится и не продаётся, но остаётся в истории заказов.
          </Alert>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {!editing ? (
              <>
                <Select
                  label="Игра"
                  value={gameSlug}
                  onChange={(event) => {
                    setGameSlug(event.target.value);
                    setSectionId(null);
                    setAttributes({});
                  }}
                >
                  <option value="">— выберите игру —</option>
                  {(games.data ?? []).map((item) => (
                    <option key={item.id} value={item.slug}>
                      {item.title}
                    </option>
                  ))}
                </Select>

                {game.data ? (
                  <Select
                    label="Раздел"
                    value={sectionId === null ? '' : String(sectionId)}
                    hint="Раздел задаёт комиссию и набор полей лота; сменить его потом нельзя."
                    onChange={(event) => {
                      setSectionId(event.target.value === '' ? null : Number(event.target.value));
                      setAttributes({});
                    }}
                  >
                    <option value="">— выберите раздел —</option>
                    {game.data.sections.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title} ({item.kind === 'goods' ? 'товары' : 'услуги'}, комиссия{' '}
                        {item.commissionBasisPoints / 100}%)
                      </option>
                    ))}
                  </Select>
                ) : null}

                {section ? (
                  <Select
                    label="Выдача"
                    value={delivery}
                    disabled={section.kind === 'service'}
                    hint={
                      section.kind === 'service'
                        ? 'Услугу оказывает продавец, автовыдачи у неё не бывает.'
                        : 'Автовыдача отдаёт покупателю единицу сразу после оплаты.'
                    }
                    onChange={(event) => setDelivery(event.target.value as DeliveryType)}
                  >
                    <option value="manual">Выдаю сам</option>
                    {section.kind === 'goods' ? <option value="auto">Автоматически</option> : null}
                  </Select>
                ) : null}
              </>
            ) : null}

            {editing || section ? (
              <>
                <TextField
                  label="Заголовок"
                  maxLength={160}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
                <TextArea
                  label="Описание"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
                <TextField
                  label="Цена, ₽"
                  inputMode="decimal"
                  value={price}
                  error={fieldErrors.price}
                  onChange={(event) => setPrice(event.target.value)}
                />

                {fields.length > 0 ? (
                  <div className={styles.group}>
                    <h2 className={styles.groupTitle}>Характеристики раздела</h2>
                    <AttributeFields
                      fields={fields}
                      draft={attributes}
                      errors={fieldErrors}
                      onChange={(name, value) =>
                        setAttributes((previous) => ({ ...previous, [name]: value }))
                      }
                    />
                  </div>
                ) : null}

                {!editing && delivery === 'auto' ? (
                  <div className={styles.group}>
                    <h2 className={styles.groupTitle}>Единицы товара</h2>
                    <TextArea
                      label="По одной в строке"
                      value={itemsText}
                      onChange={(event) => setItemsText(event.target.value)}
                      placeholder={'KEY-1111-2222\nKEY-3333-4444'}
                    />
                  </div>
                ) : null}

                {error ? <Alert tone="error">{error.message}</Alert> : null}
                {saved ? <Alert tone="success">Лот сохранён.</Alert> : null}

                <div className={styles.actions}>
                  <Button type="submit" disabled={pending}>
                    {pending ? 'Сохраняем…' : editing ? 'Сохранить' : 'Завести лот'}
                  </Button>
                </div>
              </>
            ) : null}
          </form>
        )}
      </section>

      {editing && offer && !archived ? (
        <section className={styles.card}>
          <h2 className={styles.title}>Витрина</h2>
          <p className={styles.subtitle}>{status?.hint}</p>
          <div className={styles.actions}>
            {offer.status === 'active' ? (
              <Button variant="ghost" onClick={() => changeStatus('paused')}>
                Снять с витрины
              </Button>
            ) : (
              <Button onClick={() => changeStatus('active')}>Опубликовать</Button>
            )}
            <span className={styles.spacer} />
            <Button variant="ghost" onClick={handleArchive}>
              <span className={styles.danger}>Убрать в архив</span>
            </Button>
          </div>
          <p className={styles.hint}>
            Архив необратим: лот исчезает с витрины, но остаётся в истории — на него ссылаются
            заказы. Уже оформленные заказы это не отменяет.
          </p>
        </section>
      ) : null}

      {editing && offer && !archived && offer.deliveryType === 'auto' ? (
        <StockPanel offer={offer} onAdded={setOffer} />
      ) : null}
    </div>
  );
}
