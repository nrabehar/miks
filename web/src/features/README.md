# features

One folder per business feature, mirroring the API's modules (account, contribution,
group, kyc, notification, project, share, transaction, vote, ...).

Each feature folder owns its own components, hooks, and API calls:

```
features/
  <feature>/
    components/
    hooks/
    api.ts
```

Cross-feature building blocks go in `components/ui` (shadcn primitives), `components/brand`,
`hooks/`, and `lib/` instead.
