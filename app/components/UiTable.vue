<!-- Styled table shell; pages provide <tr>/<th>/<td> markup via the slots. -->
<template>
  <div class="overflow-x-auto">
    <table class="w-full border-collapse text-left text-sm">
      <thead
        class="[&_th]:border-b [&_th]:border-line [&_th]:px-3 [&_th]:py-2 [&_th]:text-xs [&_th]:font-bold [&_th]:text-ink-muted"
      >
        <slot name="thead" />
      </thead>
      <tbody
        class="[&_td]:px-3 [&_td]:py-3 [&_tr]:border-b [&_tr]:border-line [&_tr:last-child]:border-0 [&_tr:hover]:bg-surface-muted/60 [&_tr]:transition-colors"
      >
        <slot name="tbody" />
      </tbody>
    </table>
  </div>
</template>
